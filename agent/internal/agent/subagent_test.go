package agent

import (
	"testing"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

func TestHeuristicPlan(t *testing.T) {
	tools := []api.ToolDefinition{
		{Name: "web_search", Description: "Search the web"},
		{Name: "read_file", Description: "Read a file"},
	}

	tests := []struct {
		name     string
		task     string
		minCalls int
	}{
		{"search task should trigger web_search", "search for golang tutorials", 1},
		{"research should trigger web_search", "research quantum computing", 1},
		{"general task should have at least web_search", "tell me about yourself", 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := heuristicPlan(tt.task, tools)
			if len(calls) < tt.minCalls {
				t.Errorf("expected at least %d tool calls, got %d", tt.minCalls, len(calls))
			}
		})
	}
}

func TestHeuristicPlanWebSearchKeywords(t *testing.T) {
	tools := []api.ToolDefinition{
		{Name: "web_search", Description: "Search the web"},
	}

	keywords := []string{
		"search", "find", "look up", "research", "what is", "how to",
		"latest", "news", "explain", "define", "compare", "vs",
		"verify", "check", "tutorial", "guide", "documentation",
		"troubleshoot", "debug", "fix", "error", "solution",
	}

	for _, kw := range keywords {
		t.Run("keyword_"+kw, func(t *testing.T) {
			calls := heuristicPlan("I need to "+kw+" something", tools)
			found := false
			for _, c := range calls {
				if c.Tool == "web_search" {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("expected web_search for task containing '%s'", kw)
			}
		})
	}
}

func TestContainsAny(t *testing.T) {
	tests := []struct {
		s       string
		substrs []string
		want    bool
	}{
		{"hello world", []string{"world"}, true},
		{"hello world", []string{"foo"}, false},
		{"HELLO WORLD", []string{"hello"}, true},
		{"Hello World", []string{"world"}, true},
		{"test", []string{}, false},
		{"", []string{"a"}, false},
		{"", []string{}, false},
	}

	for _, tt := range tests {
		got := containsAny(tt.s, tt.substrs)
		if got != tt.want {
			t.Errorf("containsAny(%q, %v) = %v, want %v", tt.s, tt.substrs, got, tt.want)
		}
	}
}

func TestContainsFold(t *testing.T) {
	tests := []struct {
		s, substr string
		want      bool
	}{
		{"hello world", "hello", true},
		{"hello world", "world", true},
		{"Hello World", "hello", true},
		{"HELLO WORLD", "world", true},
		{"hello", "hello world", false},
		{"", "", true},
		{"abc", "", true},
		{"abc", "d", false},
	}

	for _, tt := range tests {
		got := containsFold(tt.s, tt.substr)
		if got != tt.want {
			t.Errorf("containsFold(%q, %q) = %v, want %v", tt.s, tt.substr, got, tt.want)
		}
	}
}

func TestToLower(t *testing.T) {
	tests := []struct {
		c    byte
		want byte
	}{
		{'A', 'a'},
		{'Z', 'z'},
		{'a', 'a'},
		{'z', 'z'},
		{'0', '0'},
		{'.', '.'},
	}

	for _, tt := range tests {
		got := toLower(tt.c)
		if got != tt.want {
			t.Errorf("toLower(%c) = %c, want %c", tt.c, got, tt.want)
		}
	}
}

func TestToolsToModelDefinitions(t *testing.T) {
	tools := []api.ToolDefinition{
		{
			Name:        "web_search",
			Description: "Search the web",
			Category:    "research",
			Parameters: map[string]api.ParamDef{
				"query": {Type: "string", Description: "The query", Required: true},
			},
		},
		{
			Name:        "read_file",
			Description: "Read a file",
			Category:    "code",
			Parameters: map[string]api.ParamDef{
				"path":    {Type: "string", Description: "File path", Required: true},
				"limit":   {Type: "number", Description: "Max lines", Required: false, Default: float64(100)},
				"offset":  {Type: "number", Description: "Start line", Required: false},
			},
		},
	}

	defs := ToolsToModelDefinitions(tools)
	if len(defs) != 2 {
		t.Fatalf("expected 2 definitions, got %d", len(defs))
	}

	if defs[0].Name != "web_search" {
		t.Fatalf("expected 'web_search', got '%s'", defs[0].Name)
	}

	params := defs[0].Parameters.(map[string]any)
	props := params["properties"].(map[string]any)
	if _, ok := props["query"]; !ok {
		t.Fatal("expected 'query' property in web_search params")
	}

	required := params["required"].([]string)
	if len(required) != 1 || required[0] != "query" {
		t.Fatalf("expected required=['query'], got %v", required)
	}

	// Check read_file has optional params
	readFileParams := defs[1].Parameters.(map[string]any)
	readFileProps := readFileParams["properties"].(map[string]any)
	if _, ok := readFileProps["limit"]; !ok {
		t.Fatal("expected 'limit' property")
	}
	if _, ok := readFileProps["offset"]; !ok {
		t.Fatal("expected 'offset' property")
	}
}

func TestToolsToModelDefinitionsEmpty(t *testing.T) {
	defs := ToolsToModelDefinitions(nil)
	if len(defs) != 0 {
		t.Fatalf("expected 0 definitions for nil input, got %d", len(defs))
	}

	defs = ToolsToModelDefinitions([]api.ToolDefinition{})
	if len(defs) != 0 {
		t.Fatalf("expected 0 definitions for empty input, got %d", len(defs))
	}
}

func TestHeuristicNextSteps(t *testing.T) {
	results := []api.ToolCall{
		{Tool: "web_search", Result: map[string]any{"results": []any{}}},
	}
	calls := heuristicNextSteps(results, "task")
	if len(calls) != 0 {
		t.Fatalf("expected 0 calls, got %d", len(calls))
	}
}

func TestSystemPrompt(t *testing.T) {
	prompt := systemPrompt()
	if prompt == "" {
		t.Fatal("expected non-empty system prompt")
	}
	if len(prompt) < 50 {
		t.Fatalf("expected system prompt to be descriptive, got %d chars", len(prompt))
	}
}
