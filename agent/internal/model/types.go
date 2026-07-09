package model

import "context"

type ProviderConfig struct {
	Provider  string
	BaseURL   string
	APIKey    string
	Model     string
}

type ModelProvider interface {
	ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error)
	ChatCompletionStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk)) error
	Model() string
}

type ModelRouter struct {
	primary   ModelProvider
	fallbacks []ModelProvider
}

func NewModelRouter(primary ModelProvider, fallbacks ...ModelProvider) *ModelRouter {
	return &ModelRouter{primary: primary, fallbacks: fallbacks}
}

func (r *ModelRouter) ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	resp, err := r.primary.ChatCompletion(ctx, req)
	if err == nil {
		return resp, nil
	}
	for _, fb := range r.fallbacks {
		resp, fbErr := fb.ChatCompletion(ctx, req)
		if fbErr == nil {
			return resp, nil
		}
	}
	return nil, err
}

func (r *ModelRouter) ChatCompletionStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk)) error {
	return r.primary.ChatCompletionStream(ctx, req, onChunk)
}

func (r *ModelRouter) Model() string {
	return r.primary.Model()
}

type Message struct {
	Role         string     `json:"role"`
	Content      string     `json:"content"`
	ToolCallID   string     `json:"toolCallId,omitempty"`
	ToolCalls    []ToolCall `json:"toolCalls,omitempty"`
	Name         string     `json:"name,omitempty"`
	ExtraContent string     `json:"extraContent,omitempty"`
}

type ToolCall struct {
	ID               string           `json:"id"`
	Type             string           `json:"type"`
	Function         ToolCallFunction `json:"function"`
	ThoughtSignature string           `json:"thoughtSignature,omitempty"`
}

type ToolCallFunction struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type ToolDefinition struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Parameters  any        `json:"parameters"`
}

type ChatRequest struct {
	Model     string           `json:"model,omitempty"`
	Messages  []Message        `json:"messages"`
	Tools     []ToolDefinition `json:"tools,omitempty"`
	Stream    bool             `json:"stream"`
}

type ChatResponse struct {
	Content      string     `json:"content"`
	ToolCalls    []ToolCall `json:"toolCalls,omitempty"`
	FinishReason string     `json:"finishReason"`
	ExtraContent string     `json:"extraContent,omitempty"`
}

type StreamChunk struct {
	Content   string     `json:"content,omitempty"`
	ToolCalls []ToolCall `json:"toolCalls,omitempty"`
	FinishReason string  `json:"finishReason,omitempty"`
	Error     string     `json:"error,omitempty"`
}

type CompletionRequest struct {
	Model       string          `json:"model"`
	Messages    []Message       `json:"messages"`
	Tools       []ToolDefinition `json:"tools,omitempty"`
	Stream      bool            `json:"stream"`
}

type CompletionChunk struct {
	Content      string     `json:"content,omitempty"`
	ToolCalls    []ToolCall `json:"toolCalls,omitempty"`
	FinishReason string     `json:"finishReason,omitempty"`
}
