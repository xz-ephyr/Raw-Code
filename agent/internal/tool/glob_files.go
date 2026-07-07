package tool

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func globFilesTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "glob_files",
			Description: "Expand a glob pattern into a list of matching file paths. Use for bulk file listing or when you need to verify which files match a pattern before operating on them. Glob patterns: * matches any chars within a dir, ** matches across dirs, ? matches single char, {a,b} matches alternatives. Examples: \"src/**/*.ts\" finds all .ts files under src/, \"**/*.test.*\" finds all test files anywhere.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "Absolute path to the base directory to search from", Required: true},
				"pattern": {Type: "string", Description: "The glob pattern to expand (e.g. \"src/**/*.ts\", \"**/*.test.ts\")", Required: true},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				return nil, fmt.Errorf("path is required")
			}
			pattern, _ := params["pattern"].(string)
			if pattern == "" {
				return nil, fmt.Errorf("pattern is required")
			}

			safePath, err := e.SandboxPath(expandPath(path))
			if err != nil {
				return nil, err
			}

			// filepath.Glob doesn't support **, so we use filepath.WalkDir + filepath.Match
			var matches []string
			walkFn := func(fp string, d os.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				matched, err := filepath.Match(pattern, fp)
				if err == nil && matched {
					matches = append(matches, fp)
				}
				// Also match against just the base name
				matched, err = filepath.Match(pattern, d.Name())
				if err == nil && matched {
					matches = append(matches, fp)
				}
				// Support ** in pattern by checking if the path matches after joining
				if strings.Contains(pattern, "**") {
					rel, _ := filepath.Rel(safePath, fp)
					matched, err = filepath.Match(pattern, rel)
					if err == nil && matched {
						matches = append(matches, fp)
					}
				}
				return nil
			}

			// If pattern is just a name (no path separators), use relative matching from the base
			if !strings.Contains(pattern, string(filepath.Separator)) && !strings.Contains(pattern, "/") {
				entries, err := os.ReadDir(safePath)
				if err != nil {
					return nil, fmt.Errorf("glob failed: %w", err)
				}
				for _, entry := range entries {
					matched, err := filepath.Match(pattern, entry.Name())
					if err == nil && matched {
						matches = append(matches, filepath.Join(safePath, entry.Name()))
					}
				}
			} else {
				err = filepath.WalkDir(safePath, walkFn)
				if err != nil {
					return nil, fmt.Errorf("glob failed: %w", err)
				}
			}

			return map[string]any{
				"path":    safePath,
				"pattern": pattern,
				"matches": matches,
				"count":   len(matches),
			}, nil
		},
	}
}
