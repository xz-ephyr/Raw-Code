package tool

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/xz-ephyr/raw-code/agent/internal/sandbox"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

var dangerousPatterns = []string{
	"rm -rf /",
	"rm -rf /*",
	"rm -rf --no-preserve-root",
	"rd /s /q",
	"rmdir /s /q",
	"del /f /s",
	" shutdown",
	" reboot",
	" halt",
	" poweroff",
	" init 0",
	" init 6",
	"> /dev/sd",
	"dd if=",
	"mkfs.",
	"mkswap",
	"sudo rm -rf",
	"sudo dd",
	"sudo mkfs",
	"chmod -R 000 ",
	"chmod -R 777 /",
	"chmod 0 ",
	":(){",
}

var knownSafeCommands = []string{
	"npm", "npx", "node", "git", "go", "dotnet", "dotnet.exe",
	"python", "python3", "pip", "pip3", "cargo", "rustc",
	"deno", "bun", "yarn", "pnpm", "tsc", "eslint", "prettier",
	"make", "cmake", "gcc", "g++", "clang", "cl",
	"code", "code-insiders",
	"dir", "ls", "echo", "type", "cat", "more", "find", "findstr",
	"ps", "Get-ChildItem", "Get-Content", "Get-Process",
}

func isDangerousCommand(command string) (string, bool) {
	lower := " " + strings.ToLower(command) + " "
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lower, pattern) {
			return pattern, true
		}
	}
	return "", false
}

func looksLikePath(token string) bool {
	if token == "" {
		return false
	}
	if strings.Contains(token, "..") {
		return true
	}
	if strings.Contains(token, string(filepath.Separator)) {
		return true
	}
	if strings.Contains(token, "/") {
		return true
	}
	if runtime.GOOS == "windows" && strings.Contains(token, ":") {
		return true
	}
	return false
}

func tokenize(command string) []string {
	var tokens []string
	var current strings.Builder
	inSingle := false
	inDouble := false
	inBacktick := false

	for i := 0; i < len(command); i++ {
		c := command[i]
		switch {
		case c == '\'' && !inDouble && !inBacktick:
			inSingle = !inSingle
			current.WriteByte(c)
		case c == '"' && !inSingle && !inBacktick:
			inDouble = !inDouble
			current.WriteByte(c)
		case c == '`' && !inSingle && !inDouble:
			inBacktick = !inBacktick
			current.WriteByte(c)
		case c == ' ' || c == '\t':
			if inSingle || inDouble || inBacktick {
				current.WriteByte(c)
			} else {
				if current.Len() > 0 {
					tokens = append(tokens, current.String())
					current.Reset()
				}
			}
		default:
			current.WriteByte(c)
		}
	}
	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}
	return tokens
}

func validateCommandPaths(command string, e *Executor) error {
	if e.projectRoot == "" {
		return nil
	}

	tokens := tokenize(command)
	for _, tok := range tokens {
		if !looksLikePath(tok) {
			continue
		}

		trimmed := strings.Trim(tok, "'\"` \t")
		if trimmed == "" || trimmed == "." {
			continue
		}

		if !filepath.IsAbs(trimmed) && !strings.Contains(trimmed, "..") {
			continue
		}

		if _, err := e.SandboxPath(trimmed); err != nil {
			e.LogViolation("run_command", "path_escape_in_command", fmt.Sprintf("token=%q in command=%q", trimmed, command))
			return fmt.Errorf("command blocked: references a path outside the project root: %q", trimmed)
		}
	}
	return nil
}

func runCommandTool() ToolDef {
	return ToolDef{
		Definition: api.ToolDefinition{
			Name:        "run_command",
			Description: "Execute a shell command and return stdout, stderr, and exit code. The command runs via cmd.exe on Windows and sh -c on other platforms.",
			Category:    "system",
			Parameters: map[string]api.ParamDef{
				"command": {Type: "string", Description: "Shell command to execute", Required: true},
				"workdir": {Type: "string", Description: "Working directory for the command (relative paths resolved against project root)", Required: false},
				"timeout": {Type: "number", Description: "Timeout in seconds (default 30, max 300)", Required: false, Default: 30},
				"confirm": {Type: "boolean", Description: "Set to true to confirm running this command", Required: false},
			},
		},
		Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
			if err := e.RequireConfirm(params); err != nil {
				return nil, err
			}
			command, _ := params["command"].(string)
			if command == "" {
				return nil, fmt.Errorf("command is required")
			}

			if pattern, dangerous := isDangerousCommand(command); dangerous {
				e.LogViolation("run_command", "dangerous_command", pattern)
				return nil, fmt.Errorf("command blocked: matched dangerous pattern %q", pattern)
			}

			if err := validateCommandPaths(command, e); err != nil {
				return nil, err
			}

			workdir := e.projectRoot
			if wd, ok := params["workdir"].(string); ok && wd != "" {
				safePath, err := e.SandboxPath(wd)
				if err != nil {
					return nil, err
				}
				workdir = safePath
			}

			timeoutSec := 30.0
			if t, ok := params["timeout"].(float64); ok && t > 0 {
				timeoutSec = t
			}
			if timeoutSec > 300 {
				timeoutSec = 300
			}

			sb, sbErr := sandbox.New(128, 10)
			if sbErr == nil {
				defer sb.Close()
				stdout, stderr, exitCode, err := runShellSandboxed(ctx, sb, command, workdir, time.Duration(timeoutSec)*time.Second)
				if err != nil {
					if _, ok := err.(*exec.ExitError); !ok {
						return nil, fmt.Errorf("command execution failed: %w", err)
					}
				}
				return map[string]any{
					"stdout":    stdout,
					"stderr":    stderr,
					"exit_code": exitCode,
				}, nil
			}

			stdout, stderr, exitCode, err := runShell(ctx, command, workdir, time.Duration(timeoutSec)*time.Second)

			if err != nil {
				if _, ok := err.(*exec.ExitError); !ok {
					return nil, fmt.Errorf("command execution failed: %w", err)
				}
			}

			return map[string]any{
				"stdout":    stdout,
				"stderr":    stderr,
				"exit_code": exitCode,
			}, nil
		},
	}
}

func runShellSandboxed(ctx context.Context, sb *sandbox.Sandbox, command string, workdir string, timeout time.Duration) (string, string, int, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctx, "cmd.exe", "/c", command)
	} else {
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
	}
	if workdir != "" {
		cmd.Dir = workdir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &maxBufferWriter{buf: &stdout, limit: maxOutputSize}
	cmd.Stderr = &maxBufferWriter{buf: &stderr, limit: maxOutputSize}

	if err := cmd.Start(); err != nil {
		return "", "", -1, fmt.Errorf("command start failed: %w", err)
	}

	if assignErr := sb.AssignProcess(uint32(cmd.Process.Pid)); assignErr != nil {
	}

	err := cmd.Wait()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = -1
		}
	}

	out := stdout.String()
	errOut := stderr.String()
	if !utf8.ValidString(out) {
		out = "[binary output truncated]"
	}
	if !utf8.ValidString(errOut) {
		errOut = "[binary output truncated]"
	}
	return out, errOut, exitCode, err
}
