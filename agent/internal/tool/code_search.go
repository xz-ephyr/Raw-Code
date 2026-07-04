package tool

import (
	"context"
	"fmt"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func codeSearchTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "code_search",
			Description: "Search for code patterns across the project codebase using regex (ripgrep). Use this to find function definitions, variable usages, imports, or any code pattern.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"pattern":     {Type: "string", Description: "Regex pattern to search for", Required: true},
				"path":        {Type: "string", Description: "Optional directory path to scope the search", Required: false},
				"max_matches": {Type: "number", Description: "Maximum number of matches to return", Required: false, Default: 20},
				"file_glob":   {Type: "string", Description: "Optional glob to filter files (e.g. '*.ts', '*.go')", Required: false},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			pattern, _ := params["pattern"].(string)
			if pattern == "" {
				return nil, fmt.Errorf("pattern is required")
			}
			path, _ := params["path"].(string)
			maxMatches, _ := params["max_matches"].(float64)
			if maxMatches == 0 {
				maxMatches = 20
			}

			args := []string{"-n", "--max-count", fmt.Sprintf("%d", int(maxMatches)), "-e", pattern}
			if fp, ok := params["file_glob"].(string); ok && fp != "" {
				args = append(args, "--glob", fp)
			}
			if path != "" {
				args = append(args, path)
			} else {
				args = append(args, "-r", ".")
			}

			out, err := runCmd(ctx, "rg", args...)
			if err != nil {
				if strings.Contains(err.Error(), "exit status 1") {
					return map[string]any{"matches": []string{}, "count": 0, "pattern": pattern}, nil
				}
				return nil, err
			}

			lines := strings.Split(strings.TrimSpace(out), "\n")
			if len(lines) == 1 && lines[0] == "" {
				lines = []string{}
			}

			return map[string]any{
				"matches": lines,
				"count":   len(lines) - 1,
				"pattern": pattern,
			}, nil
		},
	}
}
