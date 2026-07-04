package tools

import (
	"context"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type ExecutorInterface interface {
	Execute(ctx context.Context, call api.ToolCall) api.ToolCall
	GetExpressURL() string
}
