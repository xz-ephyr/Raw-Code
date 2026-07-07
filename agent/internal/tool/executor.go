package tool

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Executor struct {
	registry    *Registry
	expressURL  string
	client      *http.Client
	projectRoot string
}

func NewExecutor(registry *Registry, expressURL string, projectRoot ...string) *Executor {
	e := &Executor{
		registry:   registry,
		expressURL: expressURL,
		client:     &http.Client{Timeout: 60 * time.Second},
	}
	if len(projectRoot) > 0 {
		e.projectRoot = projectRoot[0]
	}
	return e
}

func (e *Executor) ProjectRoot() string {
	return e.projectRoot
}

func (e *Executor) SandboxPath(path string) (string, error) {
	clean := filepath.Clean(path)

	// Resolve relative paths against project root
	if e.projectRoot != "" && !filepath.IsAbs(clean) {
		clean = filepath.Join(e.projectRoot, clean)
	}

	if e.projectRoot == "" {
		return clean, nil
	}

	// Verify the resolved path is within the project root
	rootClean := filepath.Clean(e.projectRoot)
	rel, err := filepath.Rel(rootClean, clean)
	if err != nil {
		return "", fmt.Errorf("path %q is outside project root: %w", path, err)
	}
	if strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("path %q is outside project root", path)
	}
	return clean, nil
}

func (e *Executor) Registry() *Registry {
	return e.registry
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
