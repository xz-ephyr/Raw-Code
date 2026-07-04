package executor

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/xz-ephyr/raw-code/agent/internal/tools"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Executor struct {
	registry   *tools.Registry
	expressURL string
	client     *http.Client
}

func NewExecutor(registry *tools.Registry, expressURL string) *Executor {
	return &Executor{
		registry:   registry,
		expressURL: expressURL,
		client:     &http.Client{Timeout: 60 * time.Second},
	}
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

func (e *Executor) GetExpressURL() string {
	return e.expressURL
}
