package tool

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func webSearchTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "web_search",
			Description: "Search the web for up-to-date information on any topic. Use this when you need current information, news, documentation, or facts.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "The search query", Required: true},
				"max_results": {Type: "number", Description: "Max results (1-10)", Required: false, Default: 5},
				"site":        {Type: "string", Description: "Restrict search to a specific domain (e.g. developer.mozilla.org)", Required: false},
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

			reqParams := map[string]any{
				"query":      query,
				"maxResults": int(maxResults),
			}
			if site, ok := params["site"].(string); ok && site != "" {
				reqParams["site"] = site
			}

			return postToExpress(ctx, e.expressURL, "webSearch", reqParams)
		},
	}
}
