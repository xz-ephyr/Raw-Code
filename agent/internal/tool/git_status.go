package tool

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func gitStatusTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "git_status",
			Description: "Show the working tree status — modified, staged, and untracked files in the git repository.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path": {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				path = "."
			}
			out, err := gitCmd(ctx, path, "status", "--short", "--branch")
			if err != nil {
				return nil, fmt.Errorf("git status failed: %w", err)
			}
			return map[string]any{"path": path, "output": out}, nil
		},
	}
}
