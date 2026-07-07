package tool

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func editFileTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "edit_file",
			Description: "Apply a patch to an existing file by replacing exact string matches. Use this for surgical edits instead of rewriting entire files.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":       {Type: "string", Description: "Absolute or relative file path", Required: true},
				"old_string": {Type: "string", Description: "Exact string to search for and replace (must match exactly)", Required: true},
				"new_string": {Type: "string", Description: "Replacement string", Required: true},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				return nil, fmt.Errorf("path is required")
			}
			oldStr, _ := params["old_string"].(string)
			if oldStr == "" {
				return nil, fmt.Errorf("old_string is required")
			}
			newStr, _ := params["new_string"].(string)

			safePath, err := e.SandboxPath(expandPath(path))
			if err != nil {
				return nil, err
			}
			path = safePath
			data, err := os.ReadFile(path)
			if err != nil {
				return nil, fmt.Errorf("failed to read file: %w", err)
			}

			content := string(data)
			count := strings.Count(content, oldStr)
			if count == 0 {
				return nil, fmt.Errorf("old_string not found in file: %s", path)
			}

			newContent := strings.Replace(content, oldStr, newStr, 1)

			if err := os.WriteFile(path, []byte(newContent), 0644); err != nil {
				return nil, fmt.Errorf("failed to write edited file: %w", err)
			}

			return map[string]any{
				"path":     path,
				"replaced": count,
				"status":   "edited",
			}, nil
		},
	}
}
