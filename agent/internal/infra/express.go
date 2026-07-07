package infra

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type ExpressClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewExpressClient(baseURL string) *ExpressClient {
	return &ExpressClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *ExpressClient) HealthCheck(ctx context.Context) error {
	req, _ := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/get_app_config", bytes.NewReader([]byte(`{"key":"health"}`)))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("express backend unreachable: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	return nil
}

func (c *ExpressClient) GetConfig(ctx context.Context, key string) (string, error) {
	body, _ := json.Marshal(map[string]string{"key": key})
	req, _ := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/get_app_config", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("get config request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("get config unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var result string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode config response: %w", err)
	}
	return result, nil
}

func (c *ExpressClient) SetConfig(ctx context.Context, key, value string) error {
	body, _ := json.Marshal(map[string]string{"key": key, "value": value})
	req, _ := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/set_app_config", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("set config request failed: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	return nil
}

func (c *ExpressClient) GetSessions(ctx context.Context) ([]map[string]any, error) {
	req, _ := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/get_all_sessions", bytes.NewReader([]byte("{}")))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get sessions request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get sessions unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var result []map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode sessions: %w", err)
	}
	return result, nil
}

type WebSearchResult struct {
	Results []map[string]any `json:"results"`
}

func (c *ExpressClient) WebSearch(ctx context.Context, query string, maxResults int) (*WebSearchResult, error) {
	body, _ := json.Marshal(map[string]any{
		"tool": "webSearch",
		"params": map[string]any{
			"query":      query,
			"maxResults": maxResults,
		},
	})

	req, _ := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/websearch", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("web search request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("web search unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var result WebSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode search results: %w", err)
	}
	return &result, nil
}
