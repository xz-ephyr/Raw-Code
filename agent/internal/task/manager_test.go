package task

import (
	"testing"
	"time"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func TestNewManager(t *testing.T) {
	m := NewManager()
	if m == nil {
		t.Fatal("expected non-nil manager")
	}
	if m.QueueLength() != 0 {
		t.Fatalf("expected empty queue, got %d", m.QueueLength())
	}
}

func TestSubmitAndGet(t *testing.T) {
	m := NewManager()
	req := api.TaskRequest{
		SessionID: "test-session",
		Type:      "direct",
		Prompt:    "test prompt",
		MaxSteps:  5,
	}

	task := NewTask(req)
	id := m.Submit(task)

	if id == "" {
		t.Fatal("expected non-empty task ID")
	}

	got, ok := m.Get(id)
	if !ok {
		t.Fatal("expected to find task")
	}
	if got.Prompt != "test prompt" {
		t.Fatalf("expected prompt 'test prompt', got '%s'", got.Prompt)
	}
	if got.Status != StatusPending {
		t.Fatalf("expected status pending, got %s", got.Status)
	}
}

func TestDequeue(t *testing.T) {
	m := NewManager()
	req := api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p1"}
	t1 := NewTask(req)
	m.Submit(t1)

	t2 := m.Dequeue()
	if t2 == nil {
		t.Fatal("expected non-nil task from dequeue")
	}
	if t2.Prompt != "p1" {
		t.Fatalf("expected prompt 'p1', got '%s'", t2.Prompt)
	}
	if t2.Status != StatusRunning {
		t.Fatalf("expected status running, got %s", t2.Status)
	}

	empty := m.Dequeue()
	if empty != nil {
		t.Fatal("expected nil from empty queue")
	}
}

func TestComplete(t *testing.T) {
	m := NewManager()
	req := api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p1"}
	task := NewTask(req)
	id := m.Submit(task)

	m.Complete(id, "result data", 3)

	got, ok := m.Get(id)
	if !ok {
		t.Fatal("expected to find task")
	}
	if got.Status != StatusCompleted {
		t.Fatalf("expected completed, got %s", got.Status)
	}
	if got.Result != "result data" {
		t.Fatalf("expected 'result data', got '%s'", got.Result)
	}
	if got.Steps != 3 {
		t.Fatalf("expected 3 steps, got %d", got.Steps)
	}
	if got.CompletedAt == nil {
		t.Fatal("expected CompletedAt to be set")
	}
}

func TestFail(t *testing.T) {
	m := NewManager()
	req := api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p1"}
	task := NewTask(req)
	id := m.Submit(task)

	m.Fail(id, "something went wrong")

	got, ok := m.Get(id)
	if !ok {
		t.Fatal("expected to find task")
	}
	if got.Status != StatusFailed {
		t.Fatalf("expected failed, got %s", got.Status)
	}
	if got.Error != "something went wrong" {
		t.Fatalf("expected error message, got '%s'", got.Error)
	}
}

func TestCancel(t *testing.T) {
	m := NewManager()
	req := api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p1"}
	task := NewTask(req)
	id := m.Submit(task)

	m.Cancel(id)

	got, ok := m.Get(id)
	if !ok {
		t.Fatal("expected to find task")
	}
	if got.Status != StatusCancelled {
		t.Fatalf("expected cancelled, got %s", got.Status)
	}
}

func TestList(t *testing.T) {
	m := NewManager()
	m.Submit(NewTask(api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p1"}))
	m.Submit(NewTask(api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p2"}))
	m.Submit(NewTask(api.TaskRequest{SessionID: "s2", Type: "delegate", Prompt: "p3"}))

	tasks := m.List()
	if len(tasks) != 3 {
		t.Fatalf("expected 3 tasks, got %d", len(tasks))
	}
}

func TestListBySession(t *testing.T) {
	m := NewManager()
	m.Submit(NewTask(api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p1"}))
	m.Submit(NewTask(api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p2"}))
	m.Submit(NewTask(api.TaskRequest{SessionID: "s2", Type: "delegate", Prompt: "p3"}))

	tasks := m.ListBySession("s1")
	if len(tasks) != 2 {
		t.Fatalf("expected 2 tasks for s1, got %d", len(tasks))
	}

	tasks = m.ListBySession("s2")
	if len(tasks) != 1 {
		t.Fatalf("expected 1 task for s2, got %d", len(tasks))
	}
}

func TestTaskTiming(t *testing.T) {
	m := NewManager()
	req := api.TaskRequest{SessionID: "s1", Type: "direct", Prompt: "p1"}
	task := NewTask(req)
	id := m.Submit(task)

	time.Sleep(5 * time.Millisecond)
	m.Complete(id, "done", 1)

	got, ok := m.Get(id)
	if !ok {
		t.Fatal("expected to find task")
	}
	if got.DurationMs <= 0 {
		t.Fatalf("expected positive duration, got %d", got.DurationMs)
	}
}
