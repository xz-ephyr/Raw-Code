package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/xz-ephyr/raw-code/agent/internal/infra"
	"github.com/xz-ephyr/raw-code/agent/internal/model"
	"github.com/xz-ephyr/raw-code/agent/internal/sandbox"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
)

func main() {
	port := os.Getenv("AGENT_PORT")
	if port == "" {
		port = "3002"
	}

	expressURL := os.Getenv("EXPRESS_URL")
	if expressURL == "" {
		expressURL = "http://localhost:3001"
	}

	apiKey := os.Getenv("AGENT_API_KEY")
	projectRoot := os.Getenv("PROJECT_ROOT")

	express := infra.NewExpressClient(expressURL)
	providerReg := loadProviderRegistry(express)

	hub := NewAgentHub(expressURL, apiKey, providerReg, projectRoot)
	srv := hub.SetupServer(port)

	runIntegrityChecks(hub.ToolRegistry)

	if apiKey == "" {
		fmt.Println("WARNING: AGENT_API_KEY is not set. Privileged endpoints are unprotected.")
	}
	if projectRoot == "" {
		fmt.Println("WARNING: PROJECT_ROOT is not set. Filesystem access is UNRESTRICTED.")
		fmt.Println("  Set PROJECT_ROOT to restrict file access to the project directory.")
	}
	if providerReg == nil || len(providerReg.AvailableProviders()) == 0 {
		fmt.Println("WARNING: No model provider configured. LLM features will use heuristic fallback.")
		fmt.Println("  Set MODEL_API_KEY env var or add API keys via the Settings UI (stored in Express DB).")
	} else {
		fmt.Printf("Provider registry loaded with %d provider(s):\n", len(providerReg.AvailableProviders()))
		for _, p := range providerReg.AvailableProviders() {
			cfg := providerReg.Config(p)
			fmt.Printf("  - %s: %s (model: %s)\n", cfg.Provider, cfg.BaseURL, cfg.Model)
		}
	}

	go func() {
		fmt.Printf("xz agent framework running on http://localhost:%s\n", port)
		fmt.Printf("Connected to Express backend at %s\n", expressURL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
}

func loadProviderRegistry(express *infra.ExpressClient) *model.ProviderRegistry {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	configs := make(map[model.Provider]*model.ProviderConfig)

	for _, provider := range model.AllProviders() {
		apiKey := os.Getenv(model.ProviderEnvVar(provider))
		if apiKey == "" {
			configKey := model.ProviderAPIKeyConfigKey(provider)
			if configKey != "" {
				if key, err := express.GetConfig(ctx, configKey); err == nil && key != "" {
					apiKey = key
				}
			}
		}
		if apiKey == "" {
			continue
		}

		baseURL := model.ProviderBaseURL(provider)

		defaultModel := "deepseek-v4-flash-free"
		switch provider {
		case model.ProviderOpenRouter:
			defaultModel = "deepseek/deepseek-chat"
		case model.ProviderGoogle:
			defaultModel = "gemini-3.5-flash"
		case model.ProviderGroq:
			defaultModel = "llama-3.1-8b-instant"
		case model.ProviderMistral:
			defaultModel = "mistral-small-latest"
		case model.ProviderCerebras:
			defaultModel = "gpt-oss-120b"
		}

		configs[provider] = &model.ProviderConfig{
			Provider: provider,
			BaseURL:  baseURL,
			APIKey:   apiKey,
			Model:    defaultModel,
		}
	}

	if len(configs) == 0 {
		return nil
	}
	return model.NewProviderRegistry(configs)
}

func runIntegrityChecks(reg *tool.Registry) {
	passed := 0
	failed := 0

	// Check 1: sandbox package loads without panic
	func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[INTEGRITY] FAIL sandbox load: panic: %v", r)
				failed++
			}
		}()
		sb, err := sandbox.New(128, 10)
		if err == nil {
			sb.Close()
		}
		passed++
		log.Printf("[INTEGRITY] PASS sandbox load (platform: %s)", runtime.GOOS)
	}()

	// Check 2: IsRestrictedPath correctly identifies restricted files
	restrictedCases := []string{
		".env",
		".gitignore",
		".prettierrc",
		".secret",
		"path/to/.hidden",
	}
	for _, c := range restrictedCases {
		if !tool.IsRestrictedPath(c) {
			log.Printf("[INTEGRITY] FAIL IsRestrictedPath(%q) returned false", c)
			failed++
		} else {
			passed++
		}
	}

	// Check 3: all registered tools have unique names
	names := make(map[string]bool)
	for _, def := range reg.List() {
		if names[def.Name] {
			log.Printf("[INTEGRITY] FAIL duplicate tool name: %q", def.Name)
			failed++
		} else {
			names[def.Name] = true
			passed++
		}
	}
	if len(names) == 0 {
		log.Printf("[INTEGRITY] FAIL no tools registered")
		failed++
	}

	log.Printf("[INTEGRITY] checks complete: %d passed, %d failed", passed, failed)
}
