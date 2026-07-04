package tools

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func gitDiffTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "git_diff",
			Description: "Show unstaged or staged diffs for modified files in the git repository.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path":     {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
				"staged":   {Type: "boolean", Description: "Show staged diff instead of unstaged", Required: false, Default: false},
				"filename": {Type: "string", Description: "Optional specific file to show diff for", Required: false},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				path = "."
			}
			args := []string{"diff"}
			if staged, ok := params["staged"].(bool); ok && staged {
				args = append(args, "--staged")
			}
			if filename, ok := params["filename"].(string); ok && filename != "" {
				args = append(args, "--", filename)
			}
			out, err := gitCmd(ctx, path, args...)
			if err != nil {
				return nil, fmt.Errorf("git diff failed: %w", err)
			}
			return map[string]any{"path": path, "output": out}, nil
		},
	}
}
