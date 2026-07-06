package model

type Provider string

const (
	ProviderOpenAI     Provider = "openai"
	ProviderOpenRouter Provider = "openrouter"
	ProviderOpenCodeZen Provider = "opencodezen"
	ProviderCerebras   Provider = "cerebras"
)

type ProviderConfig struct {
	Provider  Provider
	BaseURL   string
	APIKey    string
	Model     string
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
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Function ToolCallFunction `json:"function"`
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
