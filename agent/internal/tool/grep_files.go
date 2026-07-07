package tool

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func grepFilesTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "grep_files",
			Description: "Search file contents using a simple case-insensitive text query. Use plain text queries (not regex). Examples: searching for \"function calculateTotal\", \"import React\", \"TODO\", \"useEffect\". The query is matched as a case-insensitive substring of each line.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "Text to search for (case-insensitive)", Required: true},
				"path":        {Type: "string", Description: "Directory to search in", Required: false, Default: "."},
				"max_matches": {Type: "number", Description: "Maximum matches to return", Required: false, Default: 30},
				"file_glob":   {Type: "string", Description: "Optional glob to filter files (e.g. '*.ts')", Required: false},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			query, _ := params["query"].(string)
			if query == "" {
				return nil, fmt.Errorf("query is required")
			}
			searchPath, _ := params["path"].(string)
			if searchPath == "" {
				searchPath = "."
			}
			safePath, err := e.SandboxPath(expandPath(searchPath))
			if err != nil {
				return nil, err
			}
			searchPath = safePath
			maxMatches, _ := params["max_matches"].(float64)
			if maxMatches == 0 {
				maxMatches = 30
			}
			fileGlob, _ := params["file_glob"].(string)

			queryLower := strings.ToLower(query)
			var matches []string
			count := 0

			err = filepath.WalkDir(searchPath, func(path string, d os.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				if d.IsDir() {
					name := d.Name()
					if name == "node_modules" || name == ".git" || name == "dist" || name == ".next" || name == "build" || name == ".vite" {
						return filepath.SkipDir
					}
					return nil
				}

				if fileGlob != "" {
					match, err := filepath.Match(fileGlob, filepath.Base(path))
					if err != nil || !match {
						return nil
					}
				}

				if count >= int(maxMatches) {
					return filepath.SkipAll
				}

				data, err := os.ReadFile(path)
				if err != nil {
					return nil
				}

				lines := strings.Split(string(data), "\n")
				for i, line := range lines {
					if count >= int(maxMatches) {
						break
					}
					if strings.Contains(strings.ToLower(line), queryLower) {
						matches = append(matches, fmt.Sprintf("%s:%d:%s", path, i+1, strings.TrimRight(line, "\r")))
						count++
					}
				}
				return nil
			})
			if err != nil {
				return nil, fmt.Errorf("search failed: %w", err)
			}

			return map[string]any{
				"matches": matches,
				"count":   len(matches),
				"query":   query,
			}, nil
		},
	}
}
