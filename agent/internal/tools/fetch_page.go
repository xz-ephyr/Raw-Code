package tools

import (
	"context"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func fetchPageTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "fetch_page",
			Description: "Fetch the full content of a webpage as markdown or text. Use this to read articles, documentation, or API responses.",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"url":    {Type: "string", Description: "The URL to fetch", Required: true},
				"format": {Type: "string", Description: "Output format", Required: false, Default: "markdown", Enum: []string{"markdown", "text"}},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			url, _ := params["url"].(string)
			if url == "" {
				return nil, fmtError("url is required")
			}
			format, _ := params["format"].(string)
			if format == "" {
				format = "markdown"
			}

			return postToExpress(ctx, e.GetExpressURL(), "fetchPage", map[string]any{
				"url":       url,
				"extractAs": format,
			})
		},
	}
}
