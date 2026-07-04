package tool

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func httpRequestTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "http_request",
			Description: "Make a custom HTTP request to any URL. Use this for testing APIs, fetching data, or checking endpoints.",
			Category:    "network",
			Parameters: map[string]api.ParamDef{
				"url":     {Type: "string", Description: "Full URL to request", Required: true},
				"method":  {Type: "string", Description: "HTTP method", Required: false, Default: "GET", Enum: []string{"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"}},
				"headers": {Type: "string", Description: "JSON object of custom headers", Required: false},
				"body":    {Type: "string", Description: "Request body (for POST/PUT/PATCH)", Required: false},
				"timeout": {Type: "number", Description: "Timeout in seconds", Required: false, Default: 15},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			url, _ := params["url"].(string)
			if url == "" {
				return nil, fmt.Errorf("url is required")
			}
			method, _ := params["method"].(string)
			if method == "" {
				method = "GET"
			}
			timeoutSec, _ := params["timeout"].(float64)
			if timeoutSec == 0 {
				timeoutSec = 15
			}

			var bodyReader io.Reader
			if bodyStr, ok := params["body"].(string); ok && bodyStr != "" {
				bodyReader = strings.NewReader(bodyStr)
			}

			ctx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSec)*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
			if err != nil {
				return nil, fmt.Errorf("failed to create request: %w", err)
			}

			if headersStr, ok := params["headers"].(string); ok && headersStr != "" {
				var headers map[string]string
				if err := json.Unmarshal([]byte(headersStr), &headers); err == nil {
					for k, v := range headers {
						req.Header.Set(k, v)
					}
				}
			}

			start := time.Now()
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				return nil, fmt.Errorf("request failed: %w", err)
			}
			defer resp.Body.Close()

			respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*512))

			return map[string]any{
				"url":          url,
				"status_code":  resp.StatusCode,
				"status":       resp.Status,
				"content_type": resp.Header.Get("Content-Type"),
				"body":         string(respBody),
				"body_size":    len(respBody),
				"duration_ms":  time.Since(start).Milliseconds(),
			}, nil
		},
	}
}
