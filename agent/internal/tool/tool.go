package tool

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

const maxOutputSize = 1 << 20 // 1 MB cap on stdout/stderr each

type ToolHandler func(context.Context, *Executor, map[string]any) (any, error)

type ToolDef struct {
	Definition api.ToolDefinition
	Handler    ToolHandler
}

func postToExpress(ctx context.Context, expressURL, toolName string, params map[string]any) (any, error) {
	data, _ := json.Marshal(map[string]any{
		"tool":   toolName,
		"params": params,
	})
	req, err := http.NewRequestWithContext(ctx, "POST", expressURL+"/websearch", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("request creation failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("express error (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}
	return result, nil
}

func runCmd(ctx context.Context, name string, args ...string) (string, error) {
	var out bytes.Buffer
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdout = &out
	cmd.Stderr = &out
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%s failed: %w\n%s", name, err, strings.TrimSpace(out.String()))
	}
	return out.String(), nil
}

func RunShell(ctx context.Context, command string, workdir string, timeout time.Duration) (string, string, int, error) {
	return runShell(ctx, command, workdir, timeout)
}

type maxBufferWriter struct {
	buf   *bytes.Buffer
	limit int
}

func (w *maxBufferWriter) Write(p []byte) (int, error) {
	available := w.limit - w.buf.Len()
	if available <= 0 {
		return len(p), nil
	}
	if len(p) > available {
		p = p[:available]
	}
	return w.buf.Write(p)
}

func runShell(ctx context.Context, command string, workdir string, timeout time.Duration) (string, string, int, error) {
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

	err := cmd.Run()
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

func gitCmd(ctx context.Context, repoPath string, args ...string) (string, error) {
	cmdArgs := append([]string{"-C", repoPath}, args...)
	return runCmd(ctx, "git", cmdArgs...)
}

func expandPath(path string) string {
	return path
}
