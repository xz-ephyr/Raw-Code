package tool

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/xz-ephyr/raw-code/agent/internal/sandbox"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Executor struct {
	registry     *Registry
	expressURL   string
	client       *http.Client
	projectRoot  string
	ConfirmWrites bool
}

func NewExecutor(registry *Registry, expressURL string, projectRoot string) *Executor {
	return &Executor{
		registry:    registry,
		expressURL:  expressURL,
		client:      &http.Client{Timeout: 60 * time.Second},
		projectRoot: projectRoot,
	}
}

func (e *Executor) ProjectRoot() string {
	return e.projectRoot
}

func (e *Executor) LogViolation(tool string, vtype string, detail string) {
	sandbox.LogViolation(sandbox.Violation{
		Tool:    tool,
		Type:    vtype,
		Detail:  detail,
		Project: e.projectRoot,
	})
}

func (e *Executor) SandboxPath(path string) (string, error) {
	if e.projectRoot == "" {
		cleaned := filepath.Clean(path)
		return cleaned, nil
	}

	if strings.Contains(path, "..") {
		e.LogViolation("", "path_escape", fmt.Sprintf("path contains '..' traversal: %q", path))
		return "", fmt.Errorf("path %q is outside project root", path)
	}

	clean := filepath.Clean(path)

	if e.projectRoot != "" && !filepath.IsAbs(clean) {
		clean = filepath.Join(e.projectRoot, clean)
	}

	rootClean := filepath.Clean(e.projectRoot)

	if runtime.GOOS == "windows" {
		rootVol := filepath.VolumeName(rootClean)
		pathVol := filepath.VolumeName(clean)
		if rootVol != "" && pathVol != "" && !strings.EqualFold(rootVol, pathVol) {
			e.LogViolation("", "path_escape", fmt.Sprintf("cross-drive path: volume=%q root=%q", pathVol, rootVol))
			return "", fmt.Errorf("path %q is on a different drive than the project root", path)
		}
	}

	rel, err := filepath.Rel(rootClean, clean)
	if err != nil {
		e.LogViolation("", "path_escape", fmt.Sprintf("path=%q error=%v", path, err))
		return "", fmt.Errorf("path %q is outside project root: %w", path, err)
	}
	if strings.HasPrefix(rel, "..") {
		e.LogViolation("", "path_escape", fmt.Sprintf("path=%q resolved=%q relative=%q", path, clean, rel))
		return "", fmt.Errorf("path %q is outside project root", path)
	}

	if realPath, err := filepath.EvalSymlinks(clean); err == nil {
		rel2, err := filepath.Rel(rootClean, realPath)
		if err != nil || strings.HasPrefix(rel2, "..") {
			e.LogViolation("", "path_escape", fmt.Sprintf("path=%q symlink=%q", path, realPath))
			return "", fmt.Errorf("path %q resolves outside project root via symlink", path)
		}
		clean = realPath
	}

	return clean, nil
}

func (e *Executor) Registry() *Registry {
	return e.registry
}

func (e *Executor) RequireConfirm(params map[string]any) error {
	if !e.ConfirmWrites {
		return nil
	}
	confirm, _ := params["confirm"].(bool)
	if !confirm {
		return fmt.Errorf("this operation requires \"confirm\": true to proceed (destructive action)")
	}
	return nil
}

func (e *Executor) Execute(ctx context.Context, call api.ToolCall) api.ToolCall {
	start := time.Now()
	call.ID = fmt.Sprintf("call_%d", start.UnixMilli())

	handler, ok := e.registry.GetHandler(call.Tool)
	if !ok {
		call.Error = fmt.Sprintf("unknown tool: %s", call.Tool)
		call.Duration = time.Since(start).Milliseconds()
		return call
	}

	result, err := handler(ctx, e, call.Params)
	call.Duration = time.Since(start).Milliseconds()
	if err != nil {
		call.Error = err.Error()
	} else {
		call.Result = result
	}
	return call
}
