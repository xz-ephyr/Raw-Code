package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func findFilesTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "find_files",
			Description: "Find files by name or glob pattern recursively from a root directory.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"pattern":     {Type: "string", Description: "File name or glob pattern to search for (e.g. '*.ts', 'main.*', '**/test*')", Required: true},
				"root":        {Type: "string", Description: "Root directory to start search from", Required: false, Default: "."},
				"max_results": {Type: "number", Description: "Maximum files to return", Required: false, Default: 50},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			pattern, _ := params["pattern"].(string)
			if pattern == "" {
				return nil, fmt.Errorf("pattern is required")
			}
			root, _ := params["root"].(string)
			if root == "" {
				root = "."
			}
			root = expandPath(root)
			maxResults, _ := params["max_results"].(float64)
			if maxResults == 0 {
				maxResults = 50
			}

			var matches []string
			filepath.Walk(root, func(fp string, info os.FileInfo, err error) error {
				if err != nil {
					return nil
				}
				if len(matches) >= int(maxResults) {
					return filepath.SkipAll
				}
				matched, _ := filepath.Match(pattern, info.Name())
				if matched {
					matches = append(matches, fp)
				}
				return nil
			})

			return map[string]any{
				"pattern": pattern,
				"root":    root,
				"matches": matches,
				"count":   len(matches),
			}, nil
		},
	}
}
