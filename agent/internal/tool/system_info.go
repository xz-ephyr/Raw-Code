package tool

import (
	"context"
	"os"
	"runtime"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func systemInfoTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "system_info",
			Description: "Get information about the host system: OS, architecture, CPU cores, memory, disk space, and hostname.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"detail": {Type: "string", Description: "Detail level: 'basic' (default) or 'full'", Required: false, Default: "basic", Enum: []string{"basic", "full"}},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			detail, _ := params["detail"].(string)
			if detail == "" {
				detail = "basic"
			}

			hostname, _ := os.Hostname()
			cwd, _ := os.Getwd()

			info := map[string]any{
				"hostname":   hostname,
				"os":         runtime.GOOS,
				"arch":       runtime.GOARCH,
				"go_version": runtime.Version(),
				"cpu_cores":  runtime.NumCPU(),
				"cwd":        cwd,
			}

			if detail == "full" {
				diskOut, _ := runCmd(ctx, "df", "-h", "/")
				uptimeOut, _ := runCmd(ctx, "uptime")
				info["disk"] = diskOut
				info["uptime"] = uptimeOut
			}

			return info, nil
		},
	}
}
