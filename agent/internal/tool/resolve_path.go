package tool

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func resolvePathTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "resolve_path",
			Description: "Resolve a file path: expand ~, resolve symlinks, and return the absolute canonical path.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"path": {Type: "string", Description: "Path to resolve (supports ~, .., symlinks)", Required: true},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				return nil, fmt.Errorf("path is required")
			}

			expanded := expandPath(path)
			abs, err := filepath.Abs(expanded)
			if err != nil {
				return nil, fmt.Errorf("failed to resolve path: %w", err)
			}

			real, err := filepath.EvalSymlinks(abs)
			if err != nil {
				real = abs
			}

			info, err := os.Stat(real)
			exists := err == nil

			return map[string]any{
				"original":  path,
				"expanded":  expanded,
				"absolute":  abs,
				"canonical": real,
				"exists":    exists,
				"is_dir":    exists && info.IsDir(),
			}, nil
		},
	}
}
