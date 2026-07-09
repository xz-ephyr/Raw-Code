package agent

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/xz-ephyr/raw-code/agent/internal/model"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
)

// mockModel provides controlled responses for testing the agent loop.
type mockModel struct {
	mu        sync.Mutex
	responses []model.ChatResponse
	pos       int
	callDelay time.Duration // delay per ChatCompletion call (for timing tests)
}

func (m *mockModel) ChatCompletion(_ context.Context, _ model.ChatRequest) (*model.ChatResponse, error) {
	if m.callDelay > 0 {
		time.Sleep(m.callDelay)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.pos >= len(m.responses) {
		return &model.ChatResponse{Content: "done", FinishReason: "stop"}, nil
	}
	r := m.responses[m.pos]
	m.pos++
	return &r, nil
}

func (m *mockModel) ChatCompletionStream(_ context.Context, _ model.ChatRequest, _ func(model.StreamChunk)) error {
	return nil
}

func (m *mockModel) Model() string { return "mock" }

func makeToolCall(name, args string) model.ToolCall {
	return model.ToolCall{
		ID: "call_" + name, Type: "function",
		Function: model.ToolCallFunction{Name: name, Arguments: args},
	}
}

// ── classifyError tests ───────────────────────────────────────────────────

func TestClassifyErrorTransient(t *testing.T) {
	transientCases := []string{
		"connection refused",
		"request timed out",
		"deadline exceeded",
		"context deadline exceeded",
		"i/o timeout",
		"too many requests: 429",
		"502 Bad Gateway",
		"503 Service Unavailable",
		"temporary failure in name resolution",
		"connection reset by peer",
	}

	for _, tc := range transientCases {
		ec := classifyError(tc)
		if ec != errorClassTransient {
			t.Errorf("expected transient for %q, got %d", tc, ec)
		}
	}
}

func TestClassifyErrorLogical(t *testing.T) {
	logicalCases := []string{
		"file not found: foo.go",
		"no such file or directory",
		"permission denied",
		"old_string not found in file: bar.go",
		"path is required",
		"invalid parameters: unknown field",
		"path is outside project root",
		"unknown tool: foo",
		"failed to read file: no such file",
		"failed to write file: permission denied",
		"json: cannot unmarshal string into Go struct",
		"syntax error in command",
	}

	for _, tc := range logicalCases {
		ec := classifyError(tc)
		if ec != errorClassLogical {
			t.Errorf("expected logical for %q, got %d", tc, ec)
		}
	}
}

func TestClassifyErrorUnknown(t *testing.T) {
	// Unknown/unrecognized errors default to logical (don't waste retries)
	ec := classifyError("something unexpected happened")
	if ec != errorClassLogical {
		t.Errorf("expected logical (conservative default) for unknown error, got %d", ec)
	}
}

// ── paramsKey tests ───────────────────────────────────────────────────────

func TestParamsKey(t *testing.T) {
	k1 := paramsKey("read_file", map[string]any{"path": "foo.go"})
	k2 := paramsKey("read_file", map[string]any{"path": "foo.go"})
	k3 := paramsKey("read_file", map[string]any{"path": "bar.go"})
	k4 := paramsKey("edit_file", map[string]any{"path": "foo.go"})

	if k1 != k2 {
		t.Errorf("same params should produce same key: %q vs %q", k1, k2)
	}
	if k1 == k3 {
		t.Errorf("different params should produce different keys: %q vs %q", k1, k3)
	}
	if k1 == k4 {
		t.Errorf("different tool names should produce different keys: %q vs %q", k1, k4)
	}
}

func TestParamsKeyTruncation(t *testing.T) {
	longContent := make(map[string]any)
	longContent["data"] = string(make([]byte, 1000))
	key := paramsKey("write_file", longContent)
	if len(key) > 350 {
		t.Errorf("paramsKey should truncate long values, got %d bytes", len(key))
	}
}

// ── isEditOrWrite tests ───────────────────────────────────────────────────

func TestIsEditOrWrite(t *testing.T) {
	cases := []struct {
		name string
		want bool
	}{
		{"edit_file", true},
		{"write_file", true},
		{"read_file", false},
		{"web_search", false},
		{"run_command", false},
		{"subagent_run", false},
	}

	for _, c := range cases {
		got := isEditOrWrite(c.name)
		if got != c.want {
			t.Errorf("isEditOrWrite(%q) = %v, want %v", c.name, got, c.want)
		}
	}
}

// ── hadEditOrWriteCall tests ─────────────────────────────────────────────

func TestHadEditOrWriteCall(t *testing.T) {
	t.Run("no edits", func(t *testing.T) {
		msgs := []model.Message{
			{Role: "assistant", Content: "hello"},
			{Role: "tool", Name: "web_search", Content: "results"},
		}
		if hadEditOrWriteCall(msgs) {
			t.Error("expected false for no edit/write calls")
		}
	})

	t.Run("edit_file present", func(t *testing.T) {
		msgs := []model.Message{
			{Role: "assistant", ToolCalls: []model.ToolCall{
				{Function: model.ToolCallFunction{Name: "edit_file"}},
			}},
		}
		if !hadEditOrWriteCall(msgs) {
			t.Error("expected true for edit_file call")
		}
	})

	t.Run("write_file present", func(t *testing.T) {
		msgs := []model.Message{
			{Role: "assistant", ToolCalls: []model.ToolCall{
				{Function: model.ToolCallFunction{Name: "write_file"}},
			}},
		}
		if !hadEditOrWriteCall(msgs) {
			t.Error("expected true for write_file call")
		}
	})

	t.Run("run_command also counts as edit", func(t *testing.T) {
		msgs := []model.Message{
			{Role: "assistant", ToolCalls: []model.ToolCall{
				{Function: model.ToolCallFunction{Name: "run_command"}},
			}},
		}
		if !hadEditOrWriteCall(msgs) {
			t.Error("expected true for run_command call")
		}
	})
}

// ── StopReason constants test ─────────────────────────────────────────────

func TestStopReasonConstants(t *testing.T) {
	reasons := []StopReason{
		StopReasonMaxSteps,
		StopReasonMaxWallClock,
		StopReasonTaskComplete,
		StopReasonStuckLoop,
		StopReasonError,
		StopReasonContextDone,
	}

	expected := map[StopReason]string{
		StopReasonMaxSteps:     "max_steps",
		StopReasonMaxWallClock: "max_wall_clock",
		StopReasonTaskComplete: "task_complete",
		StopReasonStuckLoop:    "stuck_loop",
		StopReasonError:        "error",
		StopReasonContextDone:  "context_cancelled",
	}

	for _, r := range reasons {
		if string(r) != expected[r] {
			t.Errorf("StopReason %q has unexpected string value: %q", r, expected[r])
		}
	}
}

// ── StepRecord basic test ─────────────────────────────────────────────────

func TestStepRecordCreation(t *testing.T) {
	rec := StepRecord{
		Step:       1,
		ToolName:   "edit_file",
		ToolParams: "edit_file:{\"path\":\"test.go\"}",
		DurationMs: 150,
		Verified:   true,
		VerifyPassed: true,
	}

	if rec.Step != 1 {
		t.Errorf("expected step 1, got %d", rec.Step)
	}
	if rec.DurationMs != 150 {
		t.Errorf("expected 150ms, got %d", rec.DurationMs)
	}
	if !rec.Verified {
		t.Error("expected verified=true")
	}
	if !rec.VerifyPassed {
		t.Error("expected verifyPassed=true")
	}
}

// ── truncateString test ───────────────────────────────────────────────────

func TestTruncateString(t *testing.T) {
	short := "hello"
	if s := truncateString(short, 10); s != short {
		t.Errorf("expected %q, got %q", short, s)
	}

	long := "this is a very long string that should be truncated"
	want := "this is a very long string tha..."
	if s := truncateString(long, 30); s != want {
		t.Errorf("expected %q, got %q", want, s)
	}
}

// ── detectVerificationCommand tests ───────────────────────────────────────

func TestDetectVerificationCommandGoMod(t *testing.T) {
	dir := t.TempDir()
	goMod := filepath.Join(dir, "go.mod")
	if err := os.WriteFile(goMod, []byte("module test\n"), 0644); err != nil {
		t.Fatal(err)
	}

	cmd, workdir := detectVerificationCommand(dir)
	if cmd != "go build ./..." {
		t.Errorf("expected 'go build ./...', got %q", cmd)
	}
	if workdir != dir {
		t.Errorf("expected workdir %q, got %q", dir, workdir)
	}
}

func TestDetectVerificationCommandPackageJSON(t *testing.T) {
	dir := t.TempDir()
	pkg := filepath.Join(dir, "package.json")
	content := `{"scripts":{"lint":"eslint .","test":"vitest run"}}`
	if err := os.WriteFile(pkg, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	cmd, workdir := detectVerificationCommand(dir)
	if cmd != "npx lint" {
		t.Errorf("expected 'npx lint', got %q", cmd)
	}
	if workdir != dir {
		t.Errorf("expected workdir %q, got %q", dir, workdir)
	}
}

func TestDetectVerificationCommandTypeCheck(t *testing.T) {
	dir := t.TempDir()
	pkg := filepath.Join(dir, "package.json")
	content := `{"scripts":{"typecheck":"tsc --noEmit"}}`
	if err := os.WriteFile(pkg, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	cmd, _ := detectVerificationCommand(dir)
	expected := "npx typecheck"
	if cmd != expected {
		t.Errorf("expected %q, got %q", expected, cmd)
	}
}

func TestDetectVerificationCommandTypeCheckAlias(t *testing.T) {
	dir := t.TempDir()
	pkg := filepath.Join(dir, "package.json")
	content := `{"scripts":{"type-check":"tsc --noEmit"}}`
	if err := os.WriteFile(pkg, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	cmd, _ := detectVerificationCommand(dir)
	expected := "npx type-check"
	if cmd != expected {
		t.Errorf("expected %q, got %q", expected, cmd)
	}
}

func TestDetectVerificationCommandEmptyRoot(t *testing.T) {
	cmd, workdir := detectVerificationCommand("")
	if cmd != "" || workdir != "" {
		t.Errorf("expected empty for empty root, got %q, %q", cmd, workdir)
	}
}

func TestDetectVerificationCommandNoProjectFiles(t *testing.T) {
	dir := t.TempDir()
	cmd, _ := detectVerificationCommand(dir)
	if cmd != "" {
		t.Errorf("expected empty for dir without project files, got %q", cmd)
	}
}

// ── makeResult basic test ─────────────────────────────────────────────────

func TestMakeResult(t *testing.T) {
	past := time.Now().Add(-5 * time.Millisecond)
	result := makeResult(
		[]model.Message{{Role: "user", Content: "hi"}},
		5,
		"",
		StopReasonTaskComplete,
		[]StepRecord{{Step: 1, ToolName: "read_file"}},
		past,
	)

	if result.Steps != 5 {
		t.Errorf("expected steps=5, got %d", result.Steps)
	}
	if result.StopReason != StopReasonTaskComplete {
		t.Errorf("expected StopReason=%q, got %q", StopReasonTaskComplete, result.StopReason)
	}
	if len(result.StepLog) != 1 {
		t.Errorf("expected 1 step record, got %d", len(result.StepLog))
	}
	if result.StepLog[0].ToolName != "read_file" {
		t.Errorf("expected step tool 'read_file', got %q", result.StepLog[0].ToolName)
	}
	if result.WallClockMs <= 0 {
		t.Errorf("expected positive WallClockMs, got %d", result.WallClockMs)
	}
}

// ── Context-sensitive tests ───────────────────────────────────────────────

func TestMakeResultContextCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	result := makeResult(nil, 0, "context cancelled", StopReasonContextDone, nil, time.Now())
	if result.StopReason != StopReasonContextDone {
		t.Errorf("expected StopReasonContextDone, got %q", result.StopReason)
	}
	_ = ctx // verify context cancellation pattern
}

// ── Default config values for MaxTransientRetries test ────────────────────

func TestDefaultMaxTransientRetries(t *testing.T) {
	cfg := AgentLoopConfig{}
	val := cfg.MaxTransientRetries
	if val != 0 {
		t.Errorf("expected 0 (means 'use default'), got %d", val)
	}
}

// ── Integration tests (mock model) ────────────────────────────────────────

func TestLoopNormalCompletion(t *testing.T) {
	mock := &mockModel{
		responses: []model.ChatResponse{
			{Content: "Hello! How can I help you?", FinishReason: "stop"},
		},
	}
	registry := tool.NewRegistry()
	registry.RegisterDefaults()
	executor := tool.NewExecutor(registry, "", t.TempDir())

	cfg := AgentLoopConfig{
		ModelClient: mock,
		Executor:    executor,
		MaxSteps:    10,
	}

	messages := []model.Message{
		{Role: "system", Content: "You are helpful."},
		{Role: "user", Content: "Say hello."},
	}

	result := RunAgentLoop(context.Background(), cfg, messages)

	if result.StopReason != StopReasonTaskComplete {
		t.Errorf("expected StopReasonTaskComplete, got %q", result.StopReason)
	}
	if result.Steps != 1 {
		t.Errorf("expected 1 step, got %d", result.Steps)
	}
	if result.FinalResp != "Hello! How can I help you?" {
		t.Errorf("unexpected FinalResp: %q", result.FinalResp)
	}
	if result.Error != "" {
		t.Errorf("unexpected error: %s", result.Error)
	}
}

func TestLoopStuckDetection(t *testing.T) {
	args := `{"path":"nonexistent.go"}`
	tc := makeToolCall("read_file", args)

	mock := &mockModel{
		responses: []model.ChatResponse{
			{Content: "a", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
			{Content: "b", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
			{Content: "c", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
			{Content: "d", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
		},
	}

	registry := tool.NewRegistry()
	registry.RegisterDefaults()
	executor := tool.NewExecutor(registry, "", t.TempDir())

	cfg := AgentLoopConfig{
		ModelClient: mock,
		Executor:    executor,
		MaxSteps:    10,
	}

	messages := []model.Message{
		{Role: "system", Content: "System"},
		{Role: "user", Content: "Read nonexistent.go repeatedly"},
	}

	result := RunAgentLoop(context.Background(), cfg, messages)

	if result.StopReason != StopReasonStuckLoop {
		t.Errorf("expected StopReasonStuckLoop, got %q (steps=%d, err=%s)", result.StopReason, result.Steps, result.Error)
	}
	if result.Steps < 3 {
		t.Errorf("expected at least 3 steps before stuck abort, got %d", result.Steps)
	}
	// StepLog should contain at least 3 entries (2 executed + 1 stuck warning)
	if len(result.StepLog) < 3 {
		t.Errorf("expected at least 3 step log entries, got %d", len(result.StepLog))
	}
}

func TestLoopNoStuckDetectionDifferentCalls(t *testing.T) {
	tc1 := makeToolCall("read_file", `{"path":"a.go"}`)
	tc2 := makeToolCall("read_file", `{"path":"b.go"}`)

	mock := &mockModel{
		responses: []model.ChatResponse{
			{Content: "a", ToolCalls: []model.ToolCall{tc1}, FinishReason: "tool_calls"},
			{Content: "b", ToolCalls: []model.ToolCall{tc2}, FinishReason: "tool_calls"},
			{Content: "c", ToolCalls: []model.ToolCall{tc1}, FinishReason: "tool_calls"},
			{Content: "done", FinishReason: "stop"},
		},
	}

	registry := tool.NewRegistry()
	registry.RegisterDefaults()
	executor := tool.NewExecutor(registry, "", t.TempDir())

	cfg := AgentLoopConfig{
		ModelClient: mock,
		Executor:    executor,
		MaxSteps:    10,
	}

	messages := []model.Message{
		{Role: "system", Content: "System"},
		{Role: "user", Content: "Read files"},
	}

	result := RunAgentLoop(context.Background(), cfg, messages)

	// Should complete normally (different calls each time, no stuck loop)
	if result.StopReason != StopReasonTaskComplete {
		t.Errorf("expected StopReasonTaskComplete, got %q (steps=%d)", result.StopReason, result.Steps)
	}
}

func TestLoopVerificationAfterEdit(t *testing.T) {
	projectDir := t.TempDir()

	// Create a minimal Go project so verification fires
	goMod := filepath.Join(projectDir, "go.mod")
	if err := os.WriteFile(goMod, []byte("module test\n"), 0644); err != nil {
		t.Fatal(err)
	}
	mainGo := filepath.Join(projectDir, "main.go")
	if err := os.WriteFile(mainGo, []byte("package main\nfunc main() {}\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// Create a target file for edit_file
	targetFile := filepath.Join(projectDir, "target.txt")
	if err := os.WriteFile(targetFile, []byte("hello world\n"), 0644); err != nil {
		t.Fatal(err)
	}

	args := `{"path":"target.txt","old_string":"hello","new_string":"hi"}`
	tc := makeToolCall("edit_file", args)

	mock := &mockModel{
		responses: []model.ChatResponse{
			{Content: "editing...", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
			{Content: "Done editing file.", FinishReason: "stop"},
		},
	}

	registry := tool.NewRegistry()
	registry.RegisterDefaults()
	executor := tool.NewExecutor(registry, "", projectDir)

	cfg := AgentLoopConfig{
		ModelClient: mock,
		Executor:    executor,
		MaxSteps:    10,
	}

	messages := []model.Message{
		{Role: "system", Content: "System"},
		{Role: "user", Content: "Edit target.txt"},
	}

	result := RunAgentLoop(context.Background(), cfg, messages)

	if result.StopReason != StopReasonTaskComplete {
		t.Errorf("expected StopReasonTaskComplete, got %q (err=%s)", result.StopReason, result.Error)
	}

	// Check that verification ran after edit_file
	foundVerification := false
	for _, rec := range result.StepLog {
		if rec.Verified {
			foundVerification = true
			break
		}
	}
	if !foundVerification {
		t.Error("expected at least one step record with Verified=true (verification should have fired after edit_file)")
	}
}

func TestLoopVerificationSkippedWhenConfigured(t *testing.T) {
	projectDir := t.TempDir()

	goMod := filepath.Join(projectDir, "go.mod")
	if err := os.WriteFile(goMod, []byte("module test\n"), 0644); err != nil {
		t.Fatal(err)
	}

	targetFile := filepath.Join(projectDir, "target.txt")
	if err := os.WriteFile(targetFile, []byte("hello world\n"), 0644); err != nil {
		t.Fatal(err)
	}

	args := `{"path":"target.txt","old_string":"hello","new_string":"hi"}`
	tc := makeToolCall("edit_file", args)

	mock := &mockModel{
		responses: []model.ChatResponse{
			{Content: "editing...", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
			{Content: "Done.", FinishReason: "stop"},
		},
	}

	registry := tool.NewRegistry()
	registry.RegisterDefaults()
	executor := tool.NewExecutor(registry, "", projectDir)

	cfg := AgentLoopConfig{
		ModelClient:     mock,
		Executor:        executor,
		MaxSteps:        10,
		SkipVerification: true,
	}

	messages := []model.Message{
		{Role: "system", Content: "System"},
		{Role: "user", Content: "Edit target.txt"},
	}

	result := RunAgentLoop(context.Background(), cfg, messages)

	if result.StopReason != StopReasonTaskComplete {
		t.Errorf("expected StopReasonTaskComplete, got %q", result.StopReason)
	}

	// With SkipVerification=true, no step records should have Verified=true
	for _, rec := range result.StepLog {
		if rec.Verified {
			t.Errorf("expected no verification when SkipVerification=true, but found Verified=true for step %d", rec.Step)
		}
	}
}

func TestLoopWallClockBudget(t *testing.T) {
	args := `{"path":"x.go"}`
	tc := makeToolCall("read_file", args)

	// 50ms delay per mock call ensures wall clock expires after 1-2 steps
	mock := &mockModel{
		responses: []model.ChatResponse{
			{Content: "a", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
			{Content: "b", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
			{Content: "c", ToolCalls: []model.ToolCall{tc}, FinishReason: "tool_calls"},
		},
		callDelay: 50 * time.Millisecond,
	}

	registry := tool.NewRegistry()
	registry.RegisterDefaults()
	executor := tool.NewExecutor(registry, "", t.TempDir())

	// Budget of 60ms — with 50ms per call, should expire on or before step 2
	cfg := AgentLoopConfig{
		ModelClient:    mock,
		Executor:       executor,
		MaxSteps:       10,
		MaxWallClockMs: 60,
	}

	messages := []model.Message{
		{Role: "system", Content: "System"},
		{Role: "user", Content: "Read x.go"},
	}

	result := RunAgentLoop(context.Background(), cfg, messages)

	if result.StopReason != StopReasonMaxWallClock {
		t.Errorf("expected StopReasonMaxWallClock, got %q (steps=%d, err=%s)", result.StopReason, result.Steps, result.Error)
	}
}
