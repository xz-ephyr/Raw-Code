package tool

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func searchCodebaseTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "search_codebase",
			Description: "Unified codebase search — handles both content search (grep) and filename/glob search. Pass `query` to search file contents, `pattern` to match filenames, or both to search contents within a filename pattern. At least one of `query` or `pattern` is required.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"query":       {Type: "string", Description: "Text to search for in file contents (case-insensitive). Omit for filename-only search.", Required: false},
				"pattern":     {Type: "string", Description: "Glob pattern to match filenames (e.g. \"*.ts\", \"**/*.tsx\"). Omit for content-only search.", Required: false},
				"path":        {Type: "string", Description: "Directory to search in", Required: false, Default: "."},
				"file_glob":   {Type: "string", Description: "When searching contents, only search files matching this glob (e.g. \"*.ts\")", Required: false},
				"max_matches": {Type: "number", Description: "Maximum results to return (default 30)", Required: false, Default: 30},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			query, _ := params["query"].(string)
			pattern, _ := params["pattern"].(string)

			if query == "" && pattern == "" {
				return nil, fmt.Errorf("at least one of 'query' or 'pattern' is required")
			}

			searchPath, _ := params["path"].(string)
			if searchPath == "" {
				searchPath = "."
			}
			safePath, err := e.SandboxPath(searchPath)
			if err != nil {
				return nil, err
			}
			searchPath = safePath

			maxMatches, _ := params["max_matches"].(float64)
			if maxMatches == 0 {
				maxMatches = 30
			}
			fileGlob, _ := params["file_glob"].(string)

			// If only pattern (no query) → filename/glob search
			if query == "" && pattern != "" {
				return globSearch(ctx, searchPath, pattern, int(maxMatches))
			}

			// If query present (optionally with pattern or file_glob as filter) → content search
			return grepSearch(ctx, searchPath, query, fileGlob, int(maxMatches))
		},
	}
}

func globSearch(ctx context.Context, basePath, pattern string, maxMatches int) (any, error) {
	var matches []string

	walkFn := func(fp string, d os.DirEntry, err error) error {
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
		if len(matches) >= maxMatches {
			return filepath.SkipAll
		}

		matched, err := filepath.Match(pattern, fp)
		if err == nil && matched {
			matches = append(matches, fp)
			return nil
		}
		matched, err = filepath.Match(pattern, d.Name())
		if err == nil && matched {
			matches = append(matches, fp)
			return nil
		}
		if strings.Contains(pattern, "**") {
			rel, _ := filepath.Rel(basePath, fp)
			matched, err = filepath.Match(pattern, rel)
			if err == nil && matched {
				matches = append(matches, fp)
			}
		}
		return nil
	}

	if !strings.Contains(pattern, string(filepath.Separator)) && !strings.Contains(pattern, "/") {
		entries, err := os.ReadDir(basePath)
		if err != nil {
			return nil, fmt.Errorf("search failed: %w", err)
		}
		for _, entry := range entries {
			if len(matches) >= maxMatches {
				break
			}
			matched, err := filepath.Match(pattern, entry.Name())
			if err == nil && matched {
				matches = append(matches, filepath.Join(basePath, entry.Name()))
			}
		}
	} else {
		err := filepath.WalkDir(basePath, walkFn)
		if err != nil {
			return nil, fmt.Errorf("search failed: %w", err)
		}
	}

	return map[string]any{
		"path":    basePath,
		"pattern": pattern,
		"matches": matches,
		"count":   len(matches),
	}, nil
}

func grepSearch(ctx context.Context, searchPath, query, fileGlob string, maxMatches int) (any, error) {
	queryLower := strings.ToLower(query)
	var matches []string
	count := 0

	err := filepath.WalkDir(searchPath, func(path string, d os.DirEntry, err error) error {
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

		if count >= maxMatches {
			return filepath.SkipAll
		}

		if IsRestrictedPath(path) {
			return nil
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		lines := strings.Split(string(data), "\n")
		for i, line := range lines {
			if count >= maxMatches {
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
}
