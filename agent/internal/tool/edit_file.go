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
			Description: "Apply edits to an existing file. Provide old_string/new_string for exact string replacements, or a unified diff patch for surgical multi-hunk edits.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":       {Type: "string", Description: "Absolute or relative file path", Required: true},
				"old_string": {Type: "string", Description: "Exact string to search for and replace (alternative to patch)", Required: false},
				"new_string": {Type: "string", Description: "Replacement string for old_string (required if old_string is set)", Required: false},
				"patch":      {Type: "string", Description: "Unified diff patch to apply (alternative to old_string/new_string)", Required: false},
				"confirm":    {Type: "boolean", Description: "Set to true to confirm this destructive edit operation", Required: false},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			if err := e.RequireConfirm(params); err != nil {
				return nil, err
			}
			path, _ := params["path"].(string)
			if path == "" {
				return nil, fmt.Errorf("path is required")
			}

			oldStr, hasOld := params["old_string"].(string)
			newStr, _ := params["new_string"].(string)
			patchStr, hasPatch := params["patch"].(string)

			// Mode 2: unified diff patch
			if hasPatch && patchStr != "" {
				return applyDiff(e, path, patchStr)
			}

			// Mode 1: exact string replacement
			if !hasOld || oldStr == "" {
				return nil, fmt.Errorf("either old_string or patch is required")
			}

			safePath, err := e.SandboxPath(path)
			if err != nil {
				return nil, err
			}
			path = safePath

			if IsRestrictedPath(path) {
				e.LogViolation("edit_file", "restricted_file", path)
				return nil, fmt.Errorf("cannot edit restricted file (may contain secrets): %s", path)
			}

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
