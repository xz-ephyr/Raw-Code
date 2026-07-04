package tools

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func gitLogTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "git_log",
			Description: "Show the commit log with author, date, and message for recent commits.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path":  {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
				"count": {Type: "number", Description: "Number of recent commits to show", Required: false, Default: 10},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				path = "."
			}
			count, _ := params["count"].(float64)
			if count == 0 {
				count = 10
			}
			out, err := gitCmd(ctx, path,
				"log", fmt.Sprintf("--max-count=%d", int(count)),
				"--pretty=format:%h %ai %an: %s",
			)
			if err != nil {
				return nil, fmt.Errorf("git log failed: %w", err)
			}
			return map[string]any{"path": path, "count": int(count), "output": out}, nil
		},
	}
}
