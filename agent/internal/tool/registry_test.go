package tool

import (
	"context"
	"testing"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func TestNewRegistry(t *testing.T) {
	r := NewRegistry()
	if r == nil {
		t.Fatal("expected non-nil registry")
	}
	tools := r.List()
	if len(tools) != 0 {
		t.Fatalf("expected empty registry, got %d tools", len(tools))
	}
}

func TestRegisterAndGet(t *testing.T) {
	r := NewRegistry()
	def := api.ToolDefinition{
		Name:        "test_tool",
		Description: "A test tool",
		Category:    "code",
	}
	handler := func(ctx context.Context, exec *Executor, params map[string]any) (any, error) {
		return "result", nil
	}

	err := r.Register(def, handler)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	gotDef, ok := r.Get("test_tool")
	if !ok {
		t.Fatal("expected to find tool")
	}
	if gotDef.Name != "test_tool" {
		t.Fatalf("expected 'test_tool', got '%s'", gotDef.Name)
	}

	gotHandler, ok := r.GetHandler("test_tool")
	if !ok {
		t.Fatal("expected to find handler")
	}
	if gotHandler == nil {
		t.Fatal("expected non-nil handler")
	}
}

func TestRegisterDuplicate(t *testing.T) {
	r := NewRegistry()
	def := api.ToolDefinition{Name: "dup", Description: "first", Category: "code"}
	handler := func(ctx context.Context, exec *Executor, params map[string]any) (any, error) { return nil, nil }

	err := r.Register(def, handler)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	err = r.Register(def, handler)
	if err == nil {
		t.Fatal("expected error for duplicate registration")
	}
}

func TestGetNonexistent(t *testing.T) {
	r := NewRegistry()
	_, ok := r.Get("nonexistent")
	if ok {
		t.Fatal("expected false for nonexistent tool")
	}

	_, ok = r.GetHandler("nonexistent")
	if ok {
		t.Fatal("expected false for nonexistent handler")
	}
}

func TestListByCategory(t *testing.T) {
	r := NewRegistry()
	handler := func(ctx context.Context, exec *Executor, params map[string]any) (any, error) { return nil, nil }

	r.Register(api.ToolDefinition{Name: "web_search", Description: "search", Category: "research"}, handler)
	r.Register(api.ToolDefinition{Name: "read_file", Description: "read", Category: "code"}, handler)
	r.Register(api.ToolDefinition{Name: "git_status", Description: "git", Category: "git"}, handler)

	tools := r.ListByCategory("research")
	if len(tools) != 1 {
		t.Fatalf("expected 1 research tool, got %d", len(tools))
	}
	if tools[0].Name != "web_search" {
		t.Fatalf("expected 'web_search', got '%s'", tools[0].Name)
	}

	tools = r.ListByCategory("code")
	if len(tools) != 1 {
		t.Fatalf("expected 1 code tool, got %d", len(tools))
	}
}

func TestRemove(t *testing.T) {
	r := NewRegistry()
	handler := func(ctx context.Context, exec *Executor, params map[string]any) (any, error) { return nil, nil }
	r.Register(api.ToolDefinition{Name: "test_tool", Description: "test", Category: "code"}, handler)

	r.Remove("test_tool")
	_, ok := r.Get("test_tool")
	if ok {
		t.Fatal("expected tool to be removed")
	}
}

func TestRegisterDefaults(t *testing.T) {
	r := NewRegistry()
	r.RegisterDefaults()

	tools := r.List()
	if len(tools) == 0 {
		t.Fatal("expected default tools to be registered")
	}

	// Verify a few expected tools exist
	expectedTools := []string{"web_search", "read_file", "write_file", "git_status", "run_command"}
	for _, name := range expectedTools {
		def, ok := r.Get(name)
		if !ok {
			t.Fatalf("expected default tool '%s' to be registered", name)
		}
		if def.Name != name {
			t.Fatalf("expected name '%s', got '%s'", name, def.Name)
		}
	}

	// Verify all tools have handlers
	for _, def := range tools {
		_, ok := r.GetHandler(def.Name)
		if !ok {
			t.Fatalf("tool '%s' registered but missing handler", def.Name)
		}
	}
}
