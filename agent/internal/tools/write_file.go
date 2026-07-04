package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func writeFileTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "write_file",
			Description: "Write or overwrite a file with new content. Creates parent directories if they don't exist.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "Absolute or relative file path", Required: true},
				"content": {Type: "string", Description: "File content to write", Required: true},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				return nil, fmt.Errorf("path is required")
			}
			content, _ := params["content"].(string)

			path = expandPath(path)
			dir := filepath.Dir(path)
			if err := os.MkdirAll(dir, 0755); err != nil {
				return nil, fmt.Errorf("failed to create parent directories: %w", err)
			}

			if err := os.WriteFile(path, []byte(content), 0644); err != nil {
				return nil, fmt.Errorf("failed to write file: %w", err)
			}

			return map[string]any{
				"path":   path,
				"size":   len(content),
				"status": "written",
			}, nil
		},
	}
}
