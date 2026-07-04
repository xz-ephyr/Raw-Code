package tool

import (
	"context"
	"fmt"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func countLinesTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "count_lines",
			Description: "Count total lines of code in a directory, optionally filtered by file extension.",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "Directory to count lines in", Required: false, Default: "."},
				"ext":     {Type: "string", Description: "File extension filter (e.g. 'go', 'ts', 'py'). Comma-separated for multiple.", Required: false},
				"exclude": {Type: "string", Description: "Directories to exclude (e.g. 'node_modules,dist')", Required: false, Default: "node_modules,dist,.git,.next,build"},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			path, _ := params["path"].(string)
			if path == "" {
				path = "."
			}
			ext, _ := params["ext"].(string)
			exclude, _ := params["exclude"].(string)
			if exclude == "" {
				exclude = "node_modules,dist,.git,.next,build"
			}

			args := []string{}
			if ext != "" {
				for _, e := range strings.Split(ext, ",") {
					e = strings.TrimSpace(e)
					if e != "" {
						args = append(args, "--include", "*."+e)
					}
				}
			} else {
				exts := []string{"*.go", "*.ts", "*.tsx", "*.js", "*.jsx", "*.py",
					"*.rs", "*.java", "*.rb", "*.cs", "*.swift", "*.kt",
					"*.c", "*.h", "*.cpp", "*.hpp", "*.css", "*.scss",
					"*.html", "*.md", "*.yml", "*.yaml", "*.json", "*.toml", "*.sql", "*.sh", "*.tf"}
				for _, e := range exts {
					args = append(args, "--include", e)
				}
			}

			for _, d := range strings.Split(exclude, ",") {
				d = strings.TrimSpace(d)
				if d != "" {
					args = append(args, "--exclude-dir", d)
				}
			}
			args = append(args, path)

			out, err := runCmd(ctx, "cloc", args...)
			if err != nil {
				return nil, fmt.Errorf("count lines failed (install cloc): %w", err)
			}

			return map[string]any{"path": path, "cloc": out}, nil
		},
	}
}
