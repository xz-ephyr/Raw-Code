package task

import (
	"time"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Status string

const (
	StatusPending    Status = "pending"
	StatusRunning    Status = "running"
	StatusCompleted  Status = "completed"
	StatusFailed     Status = "failed"
	StatusCancelled  Status = "cancelled"
)

type Task struct {
	ID          string
	SessionID   string
	Type        string
	Status      Status
	Prompt      string
	Context     string
	Model       string
	MaxSteps    int
	ToolScope   []string
	AgentType   string
	Tools       []api.ToolCall
	Result      string
	Error       string
	Steps       int
	DurationMs  int64
	ParentID    string
	SubtaskIDs  []string
	Metadata    map[string]any
	CreatedAt   time.Time
	CompletedAt *time.Time
}

func NewTask(req api.TaskRequest) *Task {
	return &Task{
		ID:        generateID(),
		SessionID: req.SessionID,
		Type:      req.Type,
		Status:    StatusPending,
		Prompt:    req.Prompt,
		Context:   req.Context,
		Model:     req.Model,
		MaxSteps:  req.MaxSteps,
		ToolScope: req.ToolScope,
		AgentType: req.AgentType,
		CreatedAt: time.Now(),
	}
}

func (t *Task) ToAPI() api.AgentTask {
	at := api.AgentTask{
		ID:         t.ID,
		SessionID:  t.SessionID,
		Type:       t.Type,
		Status:     string(t.Status),
		Prompt:     t.Prompt,
		Context:    t.Context,
		Model:      t.Model,
		MaxSteps:   t.MaxSteps,
		ToolScope:  t.ToolScope,
		AgentType:  t.AgentType,
		Tools:      t.Tools,
		Result:     t.Result,
		Error:      t.Error,
		Steps:      t.Steps,
		DurationMs: t.DurationMs,
		ParentID:   t.ParentID,
		SubtaskIDs: t.SubtaskIDs,
		Metadata:   t.Metadata,
		CreatedAt:  t.CreatedAt,
	}
	if t.CompletedAt != nil {
		at.CompletedAt = t.CompletedAt
	}
	return at
}
