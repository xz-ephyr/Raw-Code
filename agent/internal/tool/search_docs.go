package tool

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func searchDocsTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "search_docs",
			Description: "Search technical documentation and reference material for a given topic or library.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query":   {Type: "string", Description: "Documentation search query (e.g. 'react useState typescript')", Required: true},
				"library": {Type: "string", Description: "Optional library/framework name to narrow results", Required: false},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			query, _ := params["query"].(string)
			if query == "" {
				return nil, fmt.Errorf("query is required")
			}
			library, _ := params["library"].(string)

			fullQuery := query
			if library != "" {
				fullQuery = library + " " + query
			}

			return postToExpress(ctx, e.expressURL, "webSearch", map[string]any{
				"query":      fullQuery + " documentation",
				"maxResults": 5,
			})
		},
	}
}
