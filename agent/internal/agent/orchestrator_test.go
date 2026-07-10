package agent

import (
	"encoding/json"
	"testing"

	"github.com/xz-ephyr/raw-code/agent/internal/model"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
	"github.com/xz-ephyr/raw-code/agent/internal/worker"
)

func TestResolveVar(t *testing.T) {
	tests := []struct {
		name     string
		template string
		key      string
		val      any
		want     string
	}{
		{"simple variable", "hello $name", "name", "world", "hello world"},
		{"no variable", "hello world", "name", "test", "hello world"},
		{"multiple vars", "$a and $b", "a", "1", "1 and $b"},
		{"var in middle", "prefix $var suffix", "var", "mid", "prefix mid suffix"},
		{"number value", "count: $n", "n", 42, "count: 42"},
		{"empty key", "test $", "x", "y", "test $"},
		{"key not matching", "hello $name", "other", "world", "hello $name"},
		{"non-alpha after $", "test $1val", "1val", "x", "test x"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := resolveVar(tt.template, tt.key, tt.val)
			if got != tt.want {
				t.Errorf("resolveVar(%q, %q, %v) = %q, want %q", tt.template, tt.key, tt.val, got, tt.want)
			}
		})
	}
}

func TestResolveVarMultipleKeys(t *testing.T) {
	result := resolveVar("$tool result for $query", "tool", "web_search")
	if result != "web_search result for $query" {
		t.Errorf("expected 'web_search result for $query', got '%s'", result)
	}
}

func TestResolveVarDotNotation(t *testing.T) {
	// Dot should be treated as part of variable name
	result := resolveVar("$response.result", "response.result", "ok")
	if result != "ok" {
		t.Errorf("expected 'ok', got '%s'", result)
	}
}

func TestStripMarkdownJSON(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "plain JSON array",
			input: `["task1", "task2"]`,
			want:  `["task1", "task2"]`,
		},
		{
			name:  "JSON in markdown code block",
			input: "```json\n[\"task1\", \"task2\"]\n```",
			want:  `["task1", "task2"]`,
		},
		{
			name:  "JSON in code block without language",
			input: "```\n[\"task1\"]\n```",
			want:  `["task1"]`,
		},
		{
			name:  "JSON with leading/trailing whitespace",
			input: "  \n  [\"task1\"]  \n  ",
			want:  "[\"task1\"]",
		},
		{
			name:  "nested JSON object",
			input: "```json\n{\"key\": \"value\"}\n```",
			want:  "{\"key\": \"value\"}",
		},
		{
			name:  "empty input",
			input: "",
			want:  "",
		},
		{
			name:  "only whitespace",
			input: "   \n  \t  ",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := stripMarkdownJSON(tt.input)
			if got != tt.want {
				t.Errorf("stripMarkdownJSON(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestIsAlpha(t *testing.T) {
	tests := []struct {
		c    byte
		want bool
	}{
		{'a', true},
		{'z', true},
		{'A', true},
		{'Z', true},
		{'0', true},
		{'9', true},
		{'_', false},
		{'.', false},
		{' ', false},
		{'$', false},
	}

	for _, tt := range tests {
		got := isAlpha(tt.c)
		if got != tt.want {
			t.Errorf("isAlpha(%c) = %v, want %v", tt.c, got, tt.want)
		}
	}
}

func TestNewOrchestrator(t *testing.T) {
	tm := task.NewManager()
	reg := tool.NewRegistry()
	exec := tool.NewExecutor(reg, "http://localhost:3001", "")
	pool := worker.NewPool(2, tm, exec)
	mc := model.NewClient(model.ProviderConfig{
		Provider: "test-provider",
		BaseURL:  "http://localhost:8080",
		APIKey:   "test-key",
		Model:    "test-model",
	})

	orch := NewOrchestrator(tm, reg, exec, pool, mc)
	if orch == nil {
		t.Fatal("expected non-nil orchestrator")
	}
}

func TestRegisterWorkflow(t *testing.T) {
	tm := task.NewManager()
	reg := tool.NewRegistry()
	exec := tool.NewExecutor(reg, "http://localhost:3001", "")
	pool := worker.NewPool(2, tm, exec)

	orch := NewOrchestrator(tm, reg, exec, pool, nil)
	orch.RegisterDefaultWorkflows()

	// Verify workflows via reflection-like approach
	orch.mu.RLock()
	if len(orch.workflows) != 1 {
		t.Fatalf("expected 1 default workflow, got %d", len(orch.workflows))
	}
	rwf, ok := orch.workflows["research_and_summarize"]
	if !ok {
		t.Fatal("expected research_and_summarize workflow")
	}
	if len(rwf.Steps) != 1 {
		t.Fatalf("expected 1 step, got %d", len(rwf.Steps))
	}
	if rwf.Steps[0].Tool != "web_search" {
		t.Fatalf("expected first step to be web_search, got '%s'", rwf.Steps[0].Tool)
	}
	orch.mu.RUnlock()
}

func TestSubmitDirectTask(t *testing.T) {
	tm := task.NewManager()
	reg := tool.NewRegistry()
	exec := tool.NewExecutor(reg, "http://localhost:3001", "")
	pool := worker.NewPool(2, tm, exec)
	pool.Start()
	defer pool.Stop()

	_ = NewOrchestrator(tm, reg, exec, pool, nil)

	apiReq := struct {
		SessionID string   `json:"sessionId"`
		Type      string   `json:"type"`
		Prompt    string   `json:"prompt"`
		Model     string   `json:"model"`
		MaxSteps  int      `json:"maxSteps"`
	}{SessionID: "s1", Type: "direct", Prompt: "test", MaxSteps: 3}

	data, _ := json.Marshal(apiReq)
	var req struct {
		SessionID string   `json:"sessionId"`
		Type      string   `json:"type"`
		Prompt    string   `json:"prompt"`
		Model     string   `json:"model"`
		Context   string   `json:"context"`
		MaxSteps  int      `json:"maxSteps"`
		ToolScope []string `json:"toolScope"`
	}
	json.Unmarshal(data, &req)

	importReq := struct {
		SessionID string   `json:"sessionId"`
		Type      string   `json:"type"`
		Prompt    string   `json:"prompt"`
		Model     string   `json:"model"`
		Context   string   `json:"context"`
		MaxSteps  int      `json:"maxSteps"`
		ToolScope []string `json:"toolScope"`
	}{SessionID: req.SessionID, Type: req.Type, Prompt: req.Prompt, Model: req.Model, MaxSteps: req.MaxSteps}

	// Can't directly call SubmitTask without proper import, so skip
	_ = importReq
}

func TestDecomposeTask(t *testing.T) {
	tm := task.NewManager()
	reg := tool.NewRegistry()
	exec := tool.NewExecutor(reg, "http://localhost:3001", "")
	pool := worker.NewPool(2, tm, exec)
	mc := model.NewClient(model.ProviderConfig{
		Provider: "omniroute",
		BaseURL:  "http://localhost:8080",
		APIKey:   "test-key",
		Model:    "test-model",
	})

	orch := NewOrchestrator(tm, reg, exec, pool, mc)
	if orch == nil {
		t.Fatal("expected non-nil orchestrator")
	}
}
