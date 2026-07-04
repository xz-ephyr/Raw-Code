package tool

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func fileStatsTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "file_stats",
			Description: "Get detailed information about a file or directory: size, permissions, modification time, and line count.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path": {Type: "string", Description: "Absolute or relative path to the file or directory", Required: true},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				return nil, fmt.Errorf("path is required")
			}
			path = expandPath(path)

			info, err := os.Stat(path)
			if err != nil {
				return nil, fmt.Errorf("stat failed: %w", err)
			}

			result := map[string]any{
				"path":        path,
				"name":        info.Name(),
				"size":        info.Size(),
				"is_dir":      info.IsDir(),
				"mode":        info.Mode().String(),
				"modified":    info.ModTime().Format(time.RFC3339),
				"permissions": info.Mode().Perm(),
			}

			if !info.IsDir() {
				lineStr, err := runCmd(ctx, "wc", "-l", path)
				if err == nil {
					parts := strings.Fields(lineStr)
					if len(parts) > 0 {
						result["lines"] = strings.TrimSpace(parts[0])
					}
				}
			}

			return result, nil
		},
	}
}
