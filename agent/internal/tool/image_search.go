package tool

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func imageSearchTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "image_search",
			Description: "Search for images on the web by query. Returns image URLs, dimensions, and source pages.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "The image search query", Required: true},
				"max_results": {Type: "number", Description: "Max images (1-20)", Required: false, Default: 5},
				"safe_search": {Type: "boolean", Description: "Enable safe search filtering", Required: false, Default: true},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			query, _ := params["query"].(string)
			if query == "" {
				return nil, fmt.Errorf("query is required")
			}
			maxResults, _ := params["max_results"].(float64)
			if maxResults == 0 {
				maxResults = 5
			}
			safeSearch := true
			if v, ok := params["safe_search"].(bool); ok {
				safeSearch = v
			}

			return postToExpress(ctx, e.expressURL, "imageSearch", map[string]any{
				"query":      query,
				"maxResults": int(maxResults),
				"safeSearch": safeSearch,
			})
		},
	}
}
