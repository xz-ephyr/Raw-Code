package tool

import (
	"context"
	"fmt"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func gitShowTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "git_show",
			Description: "Show the details of a specific commit: diff, author, date, and message.",
			Category:    "git",
			Parameters: map[string]api.ParamDef{
				"path":   {Type: "string", Description: "Path to the git repository", Required: false, Default: "."},
				"commit": {Type: "string", Description: "Commit hash, branch name, or reference (e.g. HEAD~3)", Required: true},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				path = "."
			}
			commit, _ := params["commit"].(string)
			if commit == "" {
				return nil, fmt.Errorf("commit is required")
			}
			out, err := gitCmd(ctx, path, "show", "--stat", "--pretty=fuller", commit)
			if err != nil {
				return nil, fmt.Errorf("git show failed: %w", err)
			}
			return map[string]any{"path": path, "commit": commit, "output": out}, nil
		},
	}
}
