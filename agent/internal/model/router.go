package model

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
)

type ProviderRegistry struct {
	configs map[Provider]*ProviderConfig
}

func NewProviderRegistry(configs map[Provider]*ProviderConfig) *ProviderRegistry {
	return &ProviderRegistry{configs: configs}
}

func (r *ProviderRegistry) Config(provider Provider) *ProviderConfig {
	return r.configs[provider]
}

func (r *ProviderRegistry) AvailableProviders() []Provider {
	providers := make([]Provider, 0, len(r.configs))
	for p := range r.configs {
		providers = append(providers, p)
	}
	return providers
}

func ResolveProvider(modelID string) Provider {
	if modelID == "" {
		return ProviderOpenCodeZen
	}
	id := strings.ToLower(modelID)
	switch {
	case strings.HasPrefix(id, "gemini-"), strings.HasPrefix(id, "gemma-"):
		return ProviderGoogle
	case strings.HasPrefix(id, "groq/"):
		return ProviderGroq
	case strings.HasPrefix(id, "mistral-"), strings.HasPrefix(id, "codestral-"),
		strings.HasPrefix(id, "devstral-"), strings.HasPrefix(id, "magistral-"):
		return ProviderMistral
	case strings.HasPrefix(id, "deepseek-"), id == "big-pickle",
		strings.HasPrefix(id, "mimo-"):
		return ProviderOpenCodeZen
	case strings.Contains(id, ":free"), strings.HasPrefix(id, "tencent/"),
		strings.HasPrefix(id, "nvidia/"), strings.HasPrefix(id, "poolside/"),
		strings.HasPrefix(id, "cohere/"), strings.HasPrefix(id, "openrouter/"),
		strings.HasPrefix(id, "openai/"):
		return ProviderOpenRouter
	case strings.HasPrefix(id, "gpt-oss-"), strings.HasPrefix(id, "zai-"):
		return ProviderCerebras
	default:
		return ProviderOpenCodeZen
	}
}

type RouterClient struct {
	registry *ProviderRegistry
	mu       sync.RWMutex
	cache    map[Provider]*Client
}

func NewRouterClient(registry *ProviderRegistry) *RouterClient {
	return &RouterClient{
		registry: registry,
		cache:    make(map[Provider]*Client),
	}
}

func (r *RouterClient) getOrCreateClient(modelID string) (*Client, error) {
	provider := ResolveProvider(modelID)

	r.mu.RLock()
	client, ok := r.cache[provider]
	r.mu.RUnlock()
	if ok {
		return client, nil
	}

	cfg := r.registry.configs[provider]
	if cfg == nil {
		cfg = r.registry.configs[ProviderOpenCodeZen]
	}
	if cfg == nil {
		return nil, fmt.Errorf("no provider config for %q (provider: %s)", modelID, provider)
	}
	clientCfg := *cfg
	clientCfg.Model = modelID
	client = NewClient(clientCfg)

	r.mu.Lock()
	r.cache[provider] = client
	r.mu.Unlock()

	return client, nil
}

func (r *RouterClient) fallbackOrder() []Provider {
	return []Provider{
		ProviderOpenCodeZen,
		ProviderGoogle,
		ProviderMistral,
		ProviderOpenRouter,
		ProviderGroq,
		ProviderCerebras,
	}
}

func (r *RouterClient) tryEach(ctx context.Context, req ChatRequest, modelID string) (*ChatResponse, error) {
	primaryProvider := ResolveProvider(modelID)
	providers := r.fallbackOrder()

	start := 0
	for i, p := range providers {
		if p == primaryProvider {
			start = i
			break
		}
	}
	ordered := make([]Provider, 0, len(providers))
	ordered = append(ordered, providers[start:]...)
	ordered = append(ordered, providers[:start]...)

	var lastErr error
	for _, p := range ordered {
		cfg := r.registry.configs[p]
		if cfg == nil {
			continue
		}
		fallbackModel := cfg.Model
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
		log.Printf("[router] provider %s (%s) failed: %v", p, fallbackModel, err)
	}
	return nil, fmt.Errorf("all providers failed, last error: %w", lastErr)
}

func (r *RouterClient) tryEachStream(ctx context.Context, req ChatRequest, modelID string, onChunk func(StreamChunk)) error {
	primaryProvider := ResolveProvider(modelID)
	providers := r.fallbackOrder()

	start := 0
	for i, p := range providers {
		if p == primaryProvider {
			start = i
			break
		}
	}
	ordered := make([]Provider, 0, len(providers))
	ordered = append(ordered, providers[start:]...)
	ordered = append(ordered, providers[:start]...)

	var lastErr error
	for _, p := range ordered {
		cfg := r.registry.configs[p]
		if cfg == nil {
			continue
		}
		fallbackModel := cfg.Model
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
		log.Printf("[router] provider %s (%s) stream failed: %v", p, fallbackModel, err)
	}
	return fmt.Errorf("all providers failed, last error: %w", lastErr)
}

func (r *RouterClient) ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	modelID := req.Model
	if modelID == "" {
		modelID = "deepseek-v4-flash-free"
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
		modelID = "deepseek-v4-flash-free"
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
	if cfg := r.registry.Config(ProviderOpenCodeZen); cfg != nil {
		return cfg.Model
	}
	for _, p := range r.registry.AvailableProviders() {
		if cfg := r.registry.Config(p); cfg != nil {
			return cfg.Model
		}
	}
	return "deepseek-v4-flash-free"
}

func ProviderBaseURL(provider Provider) string {
	switch provider {
	case ProviderOpenCodeZen:
		return "https://opencode.ai/zen/v1"
	case ProviderOpenRouter:
		return "https://openrouter.ai/api/v1"
	case ProviderGoogle:
		return "https://generativelanguage.googleapis.com/v1beta/openai/"
	case ProviderGroq:
		return "https://api.groq.com/openai/v1"
	case ProviderMistral:
		return "https://api.mistral.ai/v1"
	case ProviderCerebras:
		return "https://api.cerebras.ai/v1"
	default:
		return "https://opencode.ai/zen/v1"
	}
}

func ProviderAPIKeyConfigKey(provider Provider) string {
	switch provider {
	case ProviderGoogle:
		return "api-key"
	case ProviderGroq:
		return "groq-api-key"
	case ProviderMistral:
		return "mistral-api-key"
	case ProviderOpenRouter:
		return "openrouter-api-key"
	case ProviderCerebras:
		return "cerebras-api-key"
	case ProviderOpenCodeZen:
		return "opencodezen-api-key"
	default:
		return ""
	}
}

func ProviderEnvVar(provider Provider) string {
	switch provider {
	case ProviderGoogle:
		return "API_KEY"
	case ProviderGroq:
		return "GROQ_API_KEY"
	case ProviderMistral:
		return "MISTRAL_API_KEY"
	case ProviderOpenRouter:
		return "OPENROUTER_API_KEY"
	case ProviderCerebras:
		return "CEREBRAS_API_KEY"
	case ProviderOpenCodeZen:
		return "MODEL_API_KEY"
	default:
		return ""
	}
}

func AllProviders() []Provider {
	return []Provider{
		ProviderOpenCodeZen,
		ProviderOpenRouter,
		ProviderGoogle,
		ProviderGroq,
		ProviderMistral,
		ProviderCerebras,
	}
}
