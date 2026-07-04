package tool

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func newsSearchTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "news_search",
			Description: "Search for recent news articles on a topic. Returns headlines, sources, and publication dates.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "The news search query", Required: true},
				"max_results": {Type: "number", Description: "Max articles (1-10)", Required: false, Default: 5},
				"freshness":   {Type: "string", Description: "Time range for news", Required: false, Default: "week", Enum: []string{"hour", "day", "week", "month"}},
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
			freshness, _ := params["freshness"].(string)
			if freshness == "" {
				freshness = "week"
			}

			return postToExpress(ctx, e.expressURL, "newsSearch", map[string]any{
				"query":      query,
				"maxResults": int(maxResults),
				"freshness":  freshness,
			})
		},
	}
}
