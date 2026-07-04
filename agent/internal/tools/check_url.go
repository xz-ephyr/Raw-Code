package tools

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func checkURLTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "check_url",
			Description: "Check if a URL is reachable and return its HTTP status code, response time, and content type.",
			Category:    "network",
			Parameters: map[string]api.ParamDef{
				"url": {Type: "string", Description: "URL to check", Required: true},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			url, _ := params["url"].(string)
			if url == "" {
				return nil, fmt.Errorf("url is required")
			}

			start := time.Now()
			ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, "HEAD", url, nil)
			if err != nil {
				return nil, fmt.Errorf("failed to create request: %w", err)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				// fallback to GET
				getReq, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
				resp, err = http.DefaultClient.Do(getReq)
				if err != nil {
					return nil, fmt.Errorf("URL unreachable: %w", err)
				}
			}
			defer resp.Body.Close()

			return map[string]any{
				"url":          url,
				"reachable":    true,
				"status_code":  resp.StatusCode,
				"content_type": resp.Header.Get("Content-Type"),
				"response_ms":  time.Since(start).Milliseconds(),
			}, nil
		},
	}
}
