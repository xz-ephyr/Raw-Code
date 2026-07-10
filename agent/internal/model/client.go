package model

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	config     ProviderConfig
	httpClient *http.Client
}

var _ ModelProvider = (*Client)(nil)

func NewClient(config ProviderConfig) *Client {
	return &Client{
		config: config,
		httpClient: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

func (c *Client) Model() string {
	return c.config.Model
}

func (c *Client) BaseURL() string {
	return c.config.BaseURL
}

func (c *Client) Provider() string {
	return c.config.Provider
}

func (c *Client) chatURL() string {
	base := strings.TrimRight(c.config.BaseURL, "/")
	u, err := url.JoinPath(base, "/chat/completions")
	if err != nil {
		return base + "/chat/completions"
	}
	return u
}

func (c *Client) ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	model := req.Model
	if model == "" {
		model = c.config.Model
	}
	apiReq := buildAPIRequest(model, req)
	body, err := json.Marshal(apiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.chatURL(), bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.config.APIKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var apiResp openAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	choice := apiResp.Choices[0]
	result := &ChatResponse{
		Content:      choice.Message.Content,
		FinishReason: choice.FinishReason,
	}

	if len(choice.Message.ExtraContent) > 0 {
		result.ExtraContent = string(choice.Message.ExtraContent)
	}

	for _, tc := range choice.Message.ToolCalls {
		result.ToolCalls = append(result.ToolCalls, ToolCall{
			ID:   tc.ID,
			Type: tc.Type,
			Function: ToolCallFunction{
				Name:      tc.Function.Name,
				Arguments: tc.Function.Arguments,
			},
			ThoughtSignature: tc.ThoughtSignature,
		})
	}

	return result, nil
}

func (c *Client) ChatCompletionStream(ctx context.Context, req ChatRequest, onChunk func(StreamChunk)) error {
	model := req.Model
	if model == "" {
		model = c.config.Model
	}
	apiReq := buildAPIRequest(model, req)
	apiReq.Stream = true

	body, err := json.Marshal(apiReq)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.chatURL(), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	httpReq.Header.Set("Accept", "text/event-stream")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("API error (%d): %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	for scanner.Scan() {
		line := scanner.Text()

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			onChunk(StreamChunk{FinishReason: "stop"})
			return nil
		}

		var streamResp openAIStreamResponse
		if err := json.Unmarshal([]byte(data), &streamResp); err != nil {
			continue
		}

		if len(streamResp.Choices) == 0 {
			continue
		}

		choice := streamResp.Choices[0]
		chunk := StreamChunk{
			Content:      choice.Delta.Content,
			FinishReason: choice.FinishReason,
		}

		if len(choice.Delta.ToolCalls) > 0 {
			for _, tc := range choice.Delta.ToolCalls {
				chunk.ToolCalls = append(chunk.ToolCalls, ToolCall{
					ID:   tc.ID,
					Type: tc.Type,
					Function: ToolCallFunction{
						Name:      tc.Function.Name,
						Arguments: tc.Function.Arguments,
					},
					ThoughtSignature: tc.ThoughtSignature,
				})
			}
		}

		if choice.FinishReason != "" {
			chunk.FinishReason = choice.FinishReason
		}

		onChunk(chunk)
	}

	return scanner.Err()
}

func (c *Client) ChatCompletionStreamRaw(ctx context.Context, req ChatRequest) (<-chan StreamChunk, <-chan error) {
	ch := make(chan StreamChunk, 64)
	errCh := make(chan error, 1)

	go func() {
		defer close(ch)
		defer close(errCh)

		c.ChatCompletionStream(ctx, req, func(chunk StreamChunk) {
			ch <- chunk
		})
	}()

	return ch, errCh
}

type openAIMessage struct {
	Role         string            `json:"role"`
	Content      string            `json:"content"`
	ToolCallID   string            `json:"tool_call_id,omitempty"`
	ToolCalls    []openAIToolCall  `json:"tool_calls,omitempty"`
	Name         string            `json:"name,omitempty"`
	ExtraContent json.RawMessage   `json:"extra_content,omitempty"`
}

type openAIToolCall struct {
	ID               string                 `json:"id,omitempty"`
	Type             string                 `json:"type,omitempty"`
	Function         openAIToolCallFunction `json:"function,omitempty"`
	ThoughtSignature string                 `json:"thought_signature,omitempty"`
}

type openAIToolCallFunction struct {
	Name      string `json:"name,omitempty"`
	Arguments string `json:"arguments,omitempty"`
}

type openAITool struct {
	Type     string        `json:"type"`
	Function openAIFunction `json:"function"`
}

type openAIFunction struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Parameters  any    `json:"parameters"`
}

type openAIRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Tools       []openAITool    `json:"tools,omitempty"`
	Stream      bool            `json:"stream"`
	Temperature float64         `json:"temperature,omitempty"`
}

type openAIResponse struct {
	ID      string            `json:"id"`
	Object  string            `json:"object"`
	Created int64             `json:"created"`
	Model   string            `json:"model"`
	Choices []openAIChoice   `json:"choices"`
	Usage   *openAIUsage      `json:"usage,omitempty"`
}

type openAIChoice struct {
	Index        int            `json:"index"`
	Message      openAIMessage  `json:"message"`
	FinishReason string         `json:"finish_reason"`
}

type openAIUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type openAIStreamResponse struct {
	ID      string                `json:"id"`
	Object  string                `json:"object"`
	Created int64                 `json:"created"`
	Model   string                `json:"model"`
	Choices []openAIStreamChoice  `json:"choices"`
}

type openAIStreamChoice struct {
	Index        int                `json:"index"`
	Delta        openAIStreamDelta  `json:"delta"`
	FinishReason string             `json:"finish_reason"`
}

type openAIStreamDelta struct {
	Role      string            `json:"role,omitempty"`
	Content   string            `json:"content,omitempty"`
	ToolCalls []openAIToolCall  `json:"tool_calls,omitempty"`
}

func buildAPIRequest(model string, req ChatRequest) openAIRequest {
	var tools []openAITool
	for _, tool := range req.Tools {
		tools = append(tools, openAITool{
			Type: "function",
			Function: openAIFunction{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.Parameters,
			},
		})
	}

	apiReq := openAIRequest{
		Model:       model,
		Messages:    make([]openAIMessage, len(req.Messages)),
		Tools:       tools,
		Stream:      req.Stream,
		Temperature: 0.7,
	}

	for i, msg := range req.Messages {
		apiMsg := openAIMessage{
			Role:       msg.Role,
			Content:    msg.Content,
			ToolCallID: msg.ToolCallID,
			Name:       msg.Name,
		}

		if msg.ExtraContent != "" {
			apiMsg.ExtraContent = json.RawMessage(msg.ExtraContent)
		}

		if len(msg.ToolCalls) > 0 {
			apiMsg.ToolCalls = make([]openAIToolCall, len(msg.ToolCalls))
			for j, tc := range msg.ToolCalls {
				apiMsg.ToolCalls[j] = openAIToolCall{
					ID:   tc.ID,
					Type: tc.Type,
					Function: openAIToolCallFunction{
						Name:      tc.Function.Name,
						Arguments: tc.Function.Arguments,
					},
					ThoughtSignature: tc.ThoughtSignature,
				}
			}
		}

		apiReq.Messages[i] = apiMsg
	}

	return apiReq
}


