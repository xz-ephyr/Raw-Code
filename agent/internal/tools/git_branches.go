package tools

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func gitBranchesTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "git_branches",
			Description: "List all local and remote branches for a git repository.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path":   {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
				"remote": {Type: "boolean", Description: "Include remote branches", Required: false, Default: true},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				path = "."
			}
			args := []string{"branch"}
			if remote, ok := params["remote"].(bool); ok && remote {
				args = append(args, "-a")
			}
			out, err := gitCmd(ctx, path, args...)
			if err != nil {
				return nil, fmt.Errorf("git branches failed: %w", err)
			}
			return map[string]any{"path": path, "output": out}, nil
		},
	}
}
