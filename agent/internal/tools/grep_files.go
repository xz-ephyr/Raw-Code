package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func grepFilesTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "grep_files",
			Description: "Search file contents using a simple text query (case-insensitive by default). Simpler than code_search for quick lookups.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "Text to search for (case-insensitive)", Required: true},
				"path":        {Type: "string", Description: "Directory to search in", Required: false, Default: "."},
				"max_matches": {Type: "number", Description: "Maximum matches to return", Required: false, Default: 30},
				"file_glob":   {Type: "string", Description: "Optional glob to filter files (e.g. '*.ts')", Required: false},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			query, _ := params["query"].(string)
			if query == "" {
				return nil, fmt.Errorf("query is required")
			}
			searchPath, _ := params["path"].(string)
			if searchPath == "" {
				searchPath = "."
			}
			maxMatches, _ := params["max_matches"].(float64)
			if maxMatches == 0 {
				maxMatches = 30
			}

			args := []string{"-n", "-i", "--max-count", fmt.Sprintf("%d", int(maxMatches)), "-e", query}
			if fp, ok := params["file_glob"].(string); ok && fp != "" {
				args = append(args, "--glob", fp)
			}
			args = append(args, "-r", searchPath)

			out, err := runCmd(ctx, "rg", args...)
			if err != nil {
				if strings.Contains(err.Error(), "exit status 1") {
					return map[string]any{"matches": []string{}, "count": 0, "query": query}, nil
				}
				return nil, err
			}

			lines := strings.Split(strings.TrimSpace(out), "\n")
			if len(lines) == 1 && lines[0] == "" {
				lines = []string{}
			}

			return map[string]any{
				"matches": lines,
				"count":   len(lines),
				"query":   query,
			}, nil
		},
	}
}
