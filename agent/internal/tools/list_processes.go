package tools

import (
	"context"
	"fmt"
	"runtime"
	"strings"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func listProcessesTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "list_processes",
			Description: "List running processes on the system with PID, name, CPU, and memory usage.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"filter": {Type: "string", Description: "Optional process name filter (e.g. 'node', 'go')", Required: false},
				"max":    {Type: "number", Description: "Maximum number of processes to return", Required: false, Default: 30},
			},
		},
		Handler: func(ctx context.Context, e ExecutorInterface, params map[string]any) (any, error) {
			max, _ := params["max"].(float64)
			if max == 0 {
				max = 30
			}
			filter, _ := params["filter"].(string)

			var out string
			var err error
			if runtime.GOOS == "windows" {
				out, err = runCmd(ctx, "tasklist", "/FO", "CSV", "/NH")
			} else {
				psArgs := fmt.Sprintf("aux --sort=-%%mem | head -%d", int(max))
				if filter != "" {
					psArgs = fmt.Sprintf("aux | grep -i %s | head -%d", filter, int(max))
				}
				out, err = runCmd(ctx, "sh", "-c", "ps "+psArgs)
			}
			if err != nil {
				return nil, err
			}

			lines := strings.Split(strings.TrimSpace(out), "\n")
			return map[string]any{
				"processes": out,
				"count":     len(lines),
			}, nil
		},
	}
}
