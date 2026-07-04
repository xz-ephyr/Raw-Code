package tool

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func listDirectoryTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "list_directory",
			Description: "List files and directories in a project path with optional glob pattern filtering.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "Directory path to list", Required: true},
				"pattern": {Type: "string", Description: "Optional glob pattern to filter results (e.g. '*.ts', '**/*.go')", Required: false},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				path = "."
			}
			path = expandPath(path)

			entries, err := os.ReadDir(path)
			if err != nil {
				return nil, fmt.Errorf("list directory failed: %w", err)
			}

			var result []map[string]any
			for _, entry := range entries {
				info, _ := entry.Info()
				size := int64(0)
				mode := ""
				modTime := ""
				if info != nil {
					size = info.Size()
					mode = info.Mode().String()
					modTime = info.ModTime().Format(time.RFC3339)
				}
				result = append(result, map[string]any{
					"name":     entry.Name(),
					"is_dir":   entry.IsDir(),
					"size":     size,
					"mode":     mode,
					"modified": modTime,
				})
			}

			if pattern, ok := params["pattern"].(string); ok && pattern != "" {
				var filtered []map[string]any
				for _, entry := range result {
					name, _ := entry["name"].(string)
					matched, _ := filepath.Match(pattern, name)
					if matched {
						filtered = append(filtered, entry)
					}
				}
				result = filtered
			}

			return map[string]any{
				"path":    path,
				"entries": result,
				"count":   len(result),
			}, nil
		},
	}
}
