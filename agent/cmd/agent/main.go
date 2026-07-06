package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/xz-ephyr/raw-code/agent/internal/infra"
	"github.com/xz-ephyr/raw-code/agent/internal/model"
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

	express := infra.NewExpressClient(expressURL)
	modelCfg := getModelConfig(express)

	hub := NewAgentHub(expressURL, apiKey, modelCfg)
	srv := hub.SetupServer(port)

	if apiKey == "" {
		fmt.Println("WARNING: AGENT_API_KEY is not set. Privileged endpoints are unprotected.")
	}
	if modelCfg == nil {
		fmt.Println("WARNING: No model provider configured. LLM features will use heuristic fallback.")
		fmt.Println("  Set MODEL_API_KEY env var or add API keys via the Settings UI (stored in Express DB).")
	} else {
		fmt.Printf("Model provider: %s at %s, model: %s\n", modelCfg.Provider, modelCfg.BaseURL, modelCfg.Model)
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

func getModelConfig(express *infra.ExpressClient) *model.ProviderConfig {
	providerStr := os.Getenv("MODEL_PROVIDER")
	if providerStr == "" {
		providerStr = "opencodezen"
	}

	apiKey := os.Getenv("MODEL_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}
	if apiKey == "" {
		apiKey = os.Getenv("OPENROUTER_API_KEY")
	}
	if apiKey == "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if key, err := express.GetConfig(ctx, "opencodezen-api-key"); err == nil && key != "" {
			apiKey = key
		}
	}
	if apiKey == "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if key, err := express.GetConfig(ctx, "openrouter-api-key"); err == nil && key != "" {
			apiKey = key
			providerStr = "openrouter"
		}
	}
	if apiKey == "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if key, err := express.GetConfig(ctx, "api-key"); err == nil && key != "" {
			apiKey = key
			providerStr = "google"
		}
	}
	if apiKey == "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if key, err := express.GetConfig(ctx, "groq-api-key"); err == nil && key != "" {
			apiKey = key
			providerStr = "groq"
		}
	}
	if apiKey == "" {
		return nil
	}

	baseURL := os.Getenv("MODEL_BASE_URL")
	modelName := os.Getenv("MODEL_NAME")

	if baseURL == "" {
		switch providerStr {
		case "opencodezen":
			baseURL = "https://opencode.ai/zen/v1"
		case "openrouter":
			baseURL = "https://openrouter.ai/api/v1"
		case "google":
			baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/"
		case "groq":
			baseURL = "https://api.groq.com/openai/v1"
		case "mistral":
			baseURL = "https://api.mistral.ai/v1"
		case "cerebras":
			baseURL = "https://api.cerebras.ai/v1"
		default:
			baseURL = "https://opencode.ai/zen/v1"
		}
	}

	if modelName == "" {
		switch providerStr {
		case "opencodezen":
			modelName = "deepseek-v4-flash-free"
		case "openrouter":
			modelName = "deepseek/deepseek-chat"
		case "google":
			modelName = "gemini-3.5-flash"
		case "groq":
			modelName = "llama-3.1-8b-instant"
		case "mistral":
			modelName = "mistral-small-latest"
		case "cerebras":
			modelName = "gpt-oss-120b"
		default:
			modelName = "deepseek-v4-flash-free"
		}
	}

	provider := model.ProviderOpenCodeZen
	switch providerStr {
	case "openai":
		provider = model.ProviderOpenAI
	case "openrouter":
		provider = model.ProviderOpenRouter
	case "opencodezen":
		provider = model.ProviderOpenCodeZen
	case "cerebras":
		provider = model.ProviderCerebras
	default:
		provider = model.ProviderOpenAI
	}

	return &model.ProviderConfig{
		Provider: provider,
		BaseURL:  baseURL,
		APIKey:   apiKey,
		Model:    modelName,
	}
}
