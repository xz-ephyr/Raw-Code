package model

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
)

type ProviderInfo struct {
	ID             string
	BaseURL        string
	APIKeyConfigKey string
	EnvVar         string
	DefaultModel   string
	ModelPrefixes  []string
	Models         []string
}

type ProviderRegistry struct {
	infos   map[string]*ProviderInfo
	configs map[string]*ProviderConfig
}

func NewProviderRegistry(configs map[string]*ProviderConfig) *ProviderRegistry {
	return &ProviderRegistry{
		configs: configs,
		infos:   make(map[string]*ProviderInfo),
	}
}

func (r *ProviderRegistry) Register(info ProviderInfo) {
	r.infos[info.ID] = &info
}

func (r *ProviderRegistry) Info(id string) *ProviderInfo {
	return r.infos[id]
}

func (r *ProviderRegistry) Config(id string) *ProviderConfig {
	return r.configs[id]
}

func (r *ProviderRegistry) SetConfig(id string, cfg *ProviderConfig) {
	r.configs[id] = cfg
}

func (r *ProviderRegistry) AllInfo() []*ProviderInfo {
	result := make([]*ProviderInfo, 0, len(r.infos))
	for _, info := range r.infos {
		result = append(result, info)
	}
	return result
}

func (r *ProviderRegistry) AvailableIDs() []string {
	ids := make([]string, 0, len(r.configs))
	for id := range r.configs {
		ids = append(ids, id)
	}
	return ids
}

func (r *ProviderRegistry) AllIDs() []string {
	ids := make([]string, 0, len(r.infos))
	for id := range r.infos {
		ids = append(ids, id)
	}
	return ids
}

func (r *ProviderRegistry) ResolveProvider(modelID string) string {
	if modelID == "" {
		return ""
	}
	id := strings.ToLower(modelID)
	for _, info := range r.infos {
		for _, prefix := range info.ModelPrefixes {
			if strings.HasPrefix(id, prefix) {
				return info.ID
			}
		}
	}
	return ""
}

func DefaultProviderRegistry() *ProviderRegistry {
	r := &ProviderRegistry{
		configs: make(map[string]*ProviderConfig),
		infos:   make(map[string]*ProviderInfo),
	}
	r.Register(ProviderInfo{
		ID:              "zenmux",
		BaseURL:         "https://zenmux.ai/api/v1",
		APIKeyConfigKey:  "zenmux-api-key",
		EnvVar:          "ZENMUX_API_KEY",
		DefaultModel:    "z-ai/glm-4.7-flash-free",
		ModelPrefixes:   []string{"deepseek/", "stepfun/", "xiaomi/", "z-ai/", "anthropic/", "openai/", "google/", "qwen/", "x-ai/", "moonshotai/", "minimax/", "mistralai/", "bytedance/", "inclusionai/"},
		Models:          []string{"z-ai/glm-4.7-flash-free", "deepseek/deepseek-v3.2", "z-ai/glm-4.6v-flash-free", "anthropic/claude-fable-5-free"},
	})
	r.Register(ProviderInfo{
		ID:              "google",
		BaseURL:         "https://generativelanguage.googleapis.com/v1beta/openai/",
		APIKeyConfigKey:  "api-key",
		EnvVar:          "API_KEY",
		DefaultModel:    "gemini-3.5-flash",
		ModelPrefixes:   []string{"gemini-", "gemma-"},
		Models:          []string{"gemini-3.5-flash", "gemini-3-flash-preview", "gemma-4-31b-it", "gemini-2.5-flash", "gemma-4-26b-a4b-it", "gemini-2.5-flash-lite"},
	})
	r.Register(ProviderInfo{
		ID:              "groq",
		BaseURL:         "https://api.groq.com/openai/v1",
		APIKeyConfigKey:  "groq-api-key",
		EnvVar:          "GROQ_API_KEY",
		DefaultModel:    "groq/compound",
		ModelPrefixes:   []string{"groq/", "qwen/", "llama-", "openai/gpt-oss-"},
		Models:          []string{"groq/compound", "groq/compound-mini", "qwen/qwen3-32b", "llama-3.1-8b-instant", "openai/gpt-oss-safeguard-20b"},
	})
	r.Register(ProviderInfo{
		ID:              "mistral",
		BaseURL:         "https://api.mistral.ai/v1",
		APIKeyConfigKey:  "mistral-api-key",
		EnvVar:          "MISTRAL_API_KEY",
		DefaultModel:    "mistral-large-latest",
		ModelPrefixes:   []string{"mistral-", "codestral-", "devstral-", "magistral-"},
		Models:          []string{"mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "magistral-medium-latest", "devstral-latest", "codestral-latest"},
	})
	r.Register(ProviderInfo{
		ID:              "openrouter",
		BaseURL:         "https://openrouter.ai/api/v1",
		APIKeyConfigKey:  "openrouter-api-key",
		EnvVar:          "OPENROUTER_API_KEY",
		DefaultModel:    "openrouter/free",
		ModelPrefixes:   []string{":free", "tencent/", "nvidia/", "poolside/", "cohere/", "openrouter/", "openai/"},
		Models:          []string{"tencent/hy3:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "poolside/laguna-m.1:free", "nvidia/nemotron-3-super-120b-a12b:free", "nvidia/nemotron-3-nano-30b-a3b:free", "openai/gpt-oss-20b:free", "nvidia/nemotron-nano-12b-v2-vl:free", "poolside/laguna-xs.2:free", "nvidia/nemotron-nano-9b-v2:free", "openrouter/free", "cohere/north-mini-code:free", "nvidia/nemotron-3.5-content-safety:free"},
	})
	r.Register(ProviderInfo{
		ID:              "cerebras",
		BaseURL:         "https://api.cerebras.ai/v1",
		APIKeyConfigKey:  "cerebras-api-key",
		EnvVar:          "CEREBRAS_API_KEY",
		DefaultModel:    "gpt-oss-120b",
		ModelPrefixes:   []string{"gpt-oss-", "zai-"},
		Models:          []string{"gpt-oss-120b", "zai-glm-4.7", "gemma-4-31b"},
	})
	return r
}

type RouterClient struct {
	registry *ProviderRegistry
	mu       sync.RWMutex
	cache    map[string]*Client
	fallback []string
}

func NewRouterClient(registry *ProviderRegistry) *RouterClient {
	return &RouterClient{
		registry: registry,
		cache:    make(map[string]*Client),
		fallback: []string{"zenmux", "google", "mistral", "openrouter", "groq", "cerebras"},
	}
}

func (r *RouterClient) getOrCreateClient(modelID string) (*Client, error) {
	provider := r.registry.ResolveProvider(modelID)
	if provider == "" {
		provider = "zenmux"
	}

	r.mu.RLock()
	client, ok := r.cache[provider]
	r.mu.RUnlock()
	if ok {
		return client, nil
	}

	cfg := r.registry.Config(provider)
	if cfg == nil {
		cfg = r.registry.Config("zenmux")
	}
	if cfg == nil {
		return nil, fmt.Errorf("no provider config for %q (resolved: %s)", modelID, provider)
	}
	clientCfg := *cfg
	clientCfg.Model = modelID
	client = NewClient(clientCfg)

	r.mu.Lock()
	r.cache[provider] = client
	r.mu.Unlock()

	return client, nil
}

func (r *RouterClient) tryEach(ctx context.Context, req ChatRequest, modelID string) (*ChatResponse, error) {
	primaryProvider := r.registry.ResolveProvider(modelID)
	fallbackOrder := r.fallback

	start := 0
	for i, p := range fallbackOrder {
		if p == primaryProvider {
			start = i
			break
		}
	}
	orderedProviders := make([]string, 0, len(fallbackOrder))
	orderedProviders = append(orderedProviders, fallbackOrder[start:]...)
	orderedProviders = append(orderedProviders, fallbackOrder[:start]...)

	var lastErr error
	for _, p := range orderedProviders {
		info := r.registry.Info(p)
		if info == nil {
			continue
		}
		cfg := r.registry.Config(p)
		if cfg == nil {
			continue
		}

		models := info.Models
		if len(models) == 0 {
			models = []string{cfg.Model}
		}
		for _, fallbackModel := range models {
			fallbackReq := req
			fallbackReq.Model = fallbackModel

			client, err := r.getOrCreateClient(fallbackModel)
			if err != nil {
				lastErr = err
				continue
			}

			resp, err := client.ChatCompletion(ctx, fallbackReq)
			if err == nil {
				if fallbackModel != modelID {
					log.Printf("[router] model %q failed, fell back to %s/%s", modelID, p, fallbackModel)
				}
				return resp, nil
			}
			lastErr = err
			log.Printf("[router] provider %s model %s failed: %v", p, fallbackModel, err)
		}
	}
	return nil, fmt.Errorf("all providers failed, last error: %w", lastErr)
}

func (r *RouterClient) tryEachStream(ctx context.Context, req ChatRequest, modelID string, onChunk func(StreamChunk)) error {
	primaryProvider := r.registry.ResolveProvider(modelID)
	fallbackOrder := r.fallback

	start := 0
	for i, p := range fallbackOrder {
		if p == primaryProvider {
			start = i
			break
		}
	}
	orderedProviders := make([]string, 0, len(fallbackOrder))
	orderedProviders = append(orderedProviders, fallbackOrder[start:]...)
	orderedProviders = append(orderedProviders, fallbackOrder[:start]...)

	var lastErr error
	for _, p := range orderedProviders {
		info := r.registry.Info(p)
		if info == nil {
			continue
		}
		cfg := r.registry.Config(p)
		if cfg == nil {
			continue
		}

		models := info.Models
		if len(models) == 0 {
			models = []string{cfg.Model}
		}
		for _, fallbackModel := range models {
			fallbackReq := req
			fallbackReq.Model = fallbackModel

			client, err := r.getOrCreateClient(fallbackModel)
			if err != nil {
				lastErr = err
				continue
			}

			err = client.ChatCompletionStream(ctx, fallbackReq, onChunk)
			if err == nil {
				if fallbackModel != modelID {
					log.Printf("[router] model %q failed (stream), fell back to %s/%s", modelID, p, fallbackModel)
				}
				return nil
			}
			lastErr = err
			log.Printf("[router] provider %s model %s stream failed: %v", p, fallbackModel, err)
		}
	}
	return fmt.Errorf("all providers failed, last error: %w", lastErr)
}

func (r *RouterClient) ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	modelID := req.Model
	if modelID == "" {
		modelID = "z-ai/glm-4.7-flash-free"
	}
	client, err := r.getOrCreateClient(modelID)
	if err != nil {
		return nil, err
	}
	resp, err := client.ChatCompletion(ctx, req)
	if err == nil {
		return resp, nil
	}
	log.Printf("[router] primary model %q failed: %v — trying fallback providers", modelID, err)
	return r.tryEach(ctx, req, modelID)
}

func (r *RouterClient) ChatCompletionStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk)) error {
	modelID := req.Model
	if modelID == "" {
		modelID = "z-ai/glm-4.7-flash-free"
	}
	client, err := r.getOrCreateClient(modelID)
	if err != nil {
		return err
	}
	err = client.ChatCompletionStream(ctx, req, onChunk)
	if err == nil {
		return nil
	}
	log.Printf("[router] primary model %q failed (stream): %v — trying fallback providers", modelID, err)
	return r.tryEachStream(ctx, req, modelID, onChunk)
}

func (r *RouterClient) Model() string {
	for _, p := range r.fallback {
		if cfg := r.registry.Config(p); cfg != nil {
			return cfg.Model
		}
	}
	return "z-ai/glm-4.7-flash-free"
}