package tool

import (
	"context"
	"fmt"
	"time"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func runCommandTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "run_command",
			Description: "Execute a shell command in the project directory. Use this for builds, tests, linters, or any shell operation.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"command": {Type: "string", Description: "Shell command to execute", Required: true},
				"timeout": {Type: "number", Description: "Timeout in seconds", Required: false, Default: 30},
				"workdir": {Type: "string", Description: "Working directory for the command", Required: false},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			command, _ := params["command"].(string)
			if command == "" {
				return nil, fmt.Errorf("command is required")
			}
			timeoutSec, _ := params["timeout"].(float64)
			if timeoutSec == 0 {
				timeoutSec = 30
			}
			workdir, _ := params["workdir"].(string)

			stdout, stderr, exitCode, _ := runShell(ctx, command, workdir, time.Duration(timeoutSec)*time.Second)

			return map[string]any{
				"stdout":   stdout,
				"stderr":   stderr,
				"exitCode": exitCode,
			}, nil
		},
	}
}
