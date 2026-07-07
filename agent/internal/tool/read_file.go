package tool

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func readFileTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "read_file",
			Description: "Read the contents of a file from the project filesystem. Supports offset and limit for reading specific sections of large files.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":   {Type: "string", Description: "Absolute or relative file path", Required: true},
				"offset": {Type: "number", Description: "Starting line (1-indexed)", Required: false},
				"limit":  {Type: "number", Description: "Max lines to read", Required: false},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				return nil, fmt.Errorf("path is required")
			}

			safePath, err := e.SandboxPath(expandPath(path))
			if err != nil {
				return nil, err
			}
			data, err := os.ReadFile(safePath)
			if err != nil {
				return nil, fmt.Errorf("read file failed: %w", err)
			}
			content := string(data)

			lines := strings.Split(content, "\n")
			if offset, ok := params["offset"].(float64); ok && offset > 0 {
				start := int(offset) - 1
				if start >= len(lines) {
					start = len(lines)
				}
				if limit, ok := params["limit"].(float64); ok && limit > 0 {
					end := start + int(limit)
					if end > len(lines) {
						end = len(lines)
					}
					content = strings.Join(lines[start:end], "\n")
				} else {
					content = strings.Join(lines[start:], "\n")
				}
			}

			return map[string]any{
				"path":    path,
				"content": content,
				"size":    len(content),
				"lines":   len(lines),
			}, nil
		},
	}
}
