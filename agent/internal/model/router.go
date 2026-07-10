package model

import (
	"context"
	"fmt"
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
		ID:              "google",
		BaseURL:         "https://generativelanguage.googleapis.com/v1beta/openai",
		APIKeyConfigKey:  "google-api-key",
		EnvVar:          "GOOGLE_API_KEY",
		DefaultModel:    "gemini-2.5-flash",
		ModelPrefixes:   []string{"gemini", "gemma"},
		Models:          []string{"gemini-2.5-flash", "gemini-3.0-flash-preview", "gemini-3.1-flash-lite-preview", "gemma-4-31b-it", "gemma-4-26b-a4b-it"},
	})
	r.Register(ProviderInfo{
		ID:              "groq",
		BaseURL:         "https://api.groq.com/openai/v1",
		APIKeyConfigKey:  "groq-api-key",
		EnvVar:          "GROQ_API_KEY",
		DefaultModel:    "llama-3.3-70b-versatile",
		ModelPrefixes:   []string{"llama", "qwen", "deepseek", "gpt-oss"},
		Models:          []string{"llama-4-scout-17b-16e-instruct", "llama-3.3-70b-versatile", "qwen3-32b", "deepseek-r1-distill-llama-70b", "gpt-oss-120b"},
	})
	r.Register(ProviderInfo{
		ID:              "cerebras",
		BaseURL:         "https://api.cerebras.ai/v1",
		APIKeyConfigKey:  "cerebras-api-key",
		EnvVar:          "CEREBRAS_API_KEY",
		DefaultModel:    "gpt-oss-120b",
		ModelPrefixes:   []string{"gpt-oss", "zai", "gemma"},
		Models:          []string{"cerebras/gpt-oss-120b", "zai-glm-4.7", "gemma-4-31b"},
	})
	r.Register(ProviderInfo{
		ID:              "mistral",
		BaseURL:         "https://api.mistral.ai/v1",
		APIKeyConfigKey:  "mistral-api-key",
		EnvVar:          "MISTRAL_API_KEY",
		DefaultModel:    "mistral-small-3.2",
		ModelPrefixes:   []string{"mistral", "codestral"},
		Models:          []string{"mistral-small-3.2", "mistral-medium-3.5", "codestral"},
	})
	r.Register(ProviderInfo{
		ID:              "sambanova",
		BaseURL:         "https://api.sambanova.ai/v1",
		APIKeyConfigKey:  "sambanova-api-key",
		EnvVar:          "SAMBANOVA_API_KEY",
		DefaultModel:    "Meta-Llama-3.3-70B-Instruct",
		ModelPrefixes:   []string{"Meta", "DeepSeek", "gpt-oss", "gemma"},
		Models:          []string{"Meta-Llama-3.3-70B-Instruct", "DeepSeek-V3.1", "DeepSeek-V3.2", "gemma-4-31B-it"},
	})
	r.Register(ProviderInfo{
		ID:              "cohere",
		BaseURL:         "https://api.cohere.com/compatibility/v1",
		APIKeyConfigKey:  "cohere-api-key",
		EnvVar:          "COHERE_API_KEY",
		DefaultModel:    "command-a-03-2026",
		ModelPrefixes:   []string{"command", "c4ai"},
		Models:          []string{"command-a-03-2026", "command-a-plus", "command-r-plus-08-2024", "command-r-08-2024", "command-r7b-12-2024", "c4ai-aya-expanse-32b"},
	})
	r.Register(ProviderInfo{
		ID:              "huggingface",
		BaseURL:         "https://api-inference.huggingface.co/v1",
		APIKeyConfigKey:  "huggingface-api-key",
		EnvVar:          "HUGGINGFACE_API_KEY",
		DefaultModel:    "meta-llama/Meta-Llama-3.1-8B-Instruct",
		ModelPrefixes:   []string{"meta-llama", "Qwen", "google"},
		Models:          []string{"meta-llama/Llama-3.2-11B-Vision-Instruct", "meta-llama/Meta-Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-72B-Instruct", "google/gemma-2-9b-it"},
	})
	r.Register(ProviderInfo{
		ID:              "cloudflare",
		BaseURL:         "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1",
		APIKeyConfigKey:  "cloudflare-api-key",
		EnvVar:          "CLOUDFLARE_API_KEY",
		DefaultModel:    "@cf/meta/llama-3.1-8b-instruct",
		ModelPrefixes:   []string{"@cf", "@hf"},
		Models:          []string{"@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3.2-3b-instruct", "@cf/qwen/qwen1.5-7b-chat-awq", "@cf/microsoft/phi-2"},
	})
	r.Register(ProviderInfo{
		ID:              "nvidia",
		BaseURL:         "https://integrate.api.nvidia.com/v1",
		APIKeyConfigKey:  "nvidia-api-key",
		EnvVar:          "NVIDIA_API_KEY",
		DefaultModel:    "nvidia/llama-3.3-nemotron-super-49b-v1",
		ModelPrefixes:   []string{"nvidia", "meta", "mistralai", "google"},
		Models:          []string{"nvidia/llama-3.3-nemotron-super-49b-v1", "nvidia/nemotron-3-nano-30b-a3b", "meta/llama-3.1-8b-instruct", "mistralai/mistral-large-2-instruct"},
	})
	r.Register(ProviderInfo{
		ID:              "deepseek",
		BaseURL:         "https://api.deepseek.com/v1",
		APIKeyConfigKey:  "deepseek-api-key",
		EnvVar:          "DEEPSEEK_API_KEY",
		DefaultModel:    "deepseek-chat",
		ModelPrefixes:   []string{"deepseek"},
		Models:          []string{"deepseek-chat", "deepseek-reasoner", "deepseek-coder"},
	})

	return r
}

type RouterClient struct {
	registry *ProviderRegistry
	mu       sync.RWMutex
	cache    map[string]*Client
}

func NewRouterClient(registry *ProviderRegistry) *RouterClient {
	return &RouterClient{
		registry: registry,
		cache:    make(map[string]*Client),
	}
}

func (r *RouterClient) getOrCreateClient(modelID string) (*Client, error) {
	provider := r.registry.ResolveProvider(modelID)
	if provider == "" {
		return nil, fmt.Errorf("no provider configured for model %q", modelID)
	}

	r.mu.RLock()
	client, ok := r.cache[provider]
	r.mu.RUnlock()
	if ok {
		return client, nil
	}

	cfg := r.registry.Config(provider)
	if cfg == nil {
		return nil, fmt.Errorf("no provider config for %q (resolved: %s)", modelID, provider)
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

func (r *RouterClient) ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	modelID := req.Model
	if modelID == "" {
		modelID = "auto"
	}
	client, err := r.getOrCreateClient(modelID)
	if err != nil {
		return nil, err
	}
	return client.ChatCompletion(ctx, req)
}

func (r *RouterClient) ChatCompletionStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk)) error {
	modelID := req.Model
	if modelID == "" {
		modelID = "auto"
	}
	client, err := r.getOrCreateClient(modelID)
	if err != nil {
		return err
	}
	return client.ChatCompletionStream(ctx, req, onChunk)
}

func (r *RouterClient) Model() string {
	return "auto"
}