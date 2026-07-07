package agent

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/xz-ephyr/raw-code/agent/internal/model"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

//go:embed prompts/subagent-system-prompt.md
var subagentSystemPrompt string

type SubAgentRequest struct {
	Task      string   `json:"task"`
	Context   string   `json:"context,omitempty"`
	Model     string   `json:"model,omitempty"`
	ToolScope []string `json:"toolScope,omitempty"`
	MaxSteps  int      `json:"maxSteps,omitempty"`
	AgentType string   `json:"agentType,omitempty"`
}

type SubAgent struct {
	ID          string
	Request     SubAgentRequest
	Result      string
	Error       string
	Steps       int
	Status      string
	CreatedAt   time.Time
	CompletedAt *time.Time
	done        chan struct{}
}

func (s *SubAgent) Wait() {
	<-s.done
}

type SubAgentManager struct {
	mu          sync.RWMutex
	agents      map[string]*SubAgent
	manager     *task.Manager
	executor    *tool.Executor
	modelClient *model.Client
}

func NewSubAgentManager(manager *task.Manager, executor *tool.Executor, modelClient *model.Client) *SubAgentManager {
	return &SubAgentManager{
		agents:      make(map[string]*SubAgent),
		manager:     manager,
		executor:    executor,
		modelClient: modelClient,
	}
}

func (sm *SubAgentManager) Spawn(ctx context.Context, req SubAgentRequest) (*SubAgent, error) {
	id := uuid.New().String()
	if req.MaxSteps <= 0 {
		req.MaxSteps = 10
	}
	if req.Model == "" && sm.modelClient != nil {
		req.Model = sm.modelClient.Model()
	} else if req.Model == "" {
		req.Model = "gemini-3.5-flash"
	}

	sub := &SubAgent{
		ID:        id,
		Request:   req,
		Status:    "running",
		CreatedAt: time.Now(),
		done:      make(chan struct{}),
	}

	sm.mu.Lock()
	sm.agents[id] = sub
	sm.mu.Unlock()

	go sm.runSubAgent(ctx, sub)
	return sub, nil
}

func (sm *SubAgentManager) runSubAgent(ctx context.Context, sub *SubAgent) {
	defer close(sub.done)

	log.Printf("[sub-agent %s] starting with model %s: %.80s...", sub.ID, sub.Request.Model, sub.Request.Task)

	runner := &subAgentRunner{
		manager:     sm.manager,
		executor:    sm.executor,
		modelClient: sm.modelClient,
		sub:         sub,
		taskCtx:     ctx,
	}

	runner.run()
}

type subAgentRunner struct {
	manager     *task.Manager
	executor    *tool.Executor
	modelClient *model.Client
	sub         *SubAgent
	taskCtx     context.Context
	messages    []model.Message
}

func (r *subAgentRunner) run() {
	if r.modelClient == nil {
		r.runWithoutModel()
		return
	}

	agentPrompt := BuildAgentSystemPrompt(r.sub.Request.AgentType)
	r.messages = []model.Message{
		{Role: "system", Content: agentPrompt},
		{Role: "user", Content: r.sub.Request.Task},
	}

	if r.sub.Request.Context != "" {
		r.messages = append(r.messages, model.Message{Role: "user", Content: "Context:\n" + r.sub.Request.Context})
	}

	for step := 0; step < r.sub.Request.MaxSteps; step++ {
		select {
		case <-r.taskCtx.Done():
			r.fail("context cancelled")
			return
		default:
		}

		toolDefs := r.getToolDefs()

		resp, err := r.modelClient.ChatCompletion(r.taskCtx, model.ChatRequest{
			Messages: r.messages,
			Tools:    toolDefs,
		})
		if err != nil {
			r.fail(fmt.Sprintf("LLM call failed: %v", err))
			return
		}

		r.messages = append(r.messages, model.Message{
			Role:    "assistant",
			Content: resp.Content,
		})

		if len(resp.ToolCalls) > 0 {
			msg := model.Message{Role: "assistant", ToolCalls: resp.ToolCalls, ExtraContent: resp.ExtraContent}
			r.messages = append(r.messages, msg)

			for _, tc := range resp.ToolCalls {
				if tc.Type != "function" {
					continue
				}

				var params map[string]any
				if err := json.Unmarshal([]byte(tc.Function.Arguments), &params); err != nil {
					params = map[string]any{"raw": tc.Function.Arguments}
				}

				call := api.ToolCall{
					ID:     tc.ID,
					Tool:   tc.Function.Name,
					Params: params,
				}

				result := r.executor.Execute(r.taskCtx, call)
				r.sub.Steps++

				resultJSON, _ := json.Marshal(result.Result)
				if resultJSON == nil {
					resultJSON = []byte("null")
				}

				resultContent := string(resultJSON)
				if result.Error != "" {
					resultContent = fmt.Sprintf("Error: %s", result.Error)
				}

				r.messages = append(r.messages, model.Message{
					Role:       "tool",
					ToolCallID: tc.ID,
					Content:    resultContent,
					Name:       tc.Function.Name,
				})
			}
		} else {
			r.complete(resp.Content, step+1)
			return
		}
	}

	r.messages = append(r.messages, model.Message{
		Role:    "user",
		Content: "Provide a concise final answer synthesizing all the information gathered.",
	})

	finalResp, err := r.modelClient.ChatCompletion(r.taskCtx, model.ChatRequest{
		Messages: r.messages,
	})
	if err != nil {
		r.fail(fmt.Sprintf("final LLM call failed: %v", err))
		return
	}

	r.complete(finalResp.Content, r.sub.Request.MaxSteps)
}

func (r *subAgentRunner) runWithoutModel() {
	log.Printf("[sub-agent %s] no model client, using heuristic planning", r.sub.ID)

	tools := []api.ToolDefinition{
		{Name: "web_search", Description: "Search the web"},
		{Name: "read_file", Description: "Read a file"},
	}

	toolCalls := heuristicPlan(r.sub.Request.Task, tools)

	for i := 0; i < r.sub.Request.MaxSteps; i++ {
		if len(toolCalls) == 0 {
			break
		}

		var wg sync.WaitGroup
		results := make([]api.ToolCall, len(toolCalls))
		for j, tc := range toolCalls {
			wg.Add(1)
			go func(idx int, call api.ToolCall) {
				defer wg.Done()
				results[idx] = r.executor.Execute(r.taskCtx, call)
			}(j, tc)
		}
		wg.Wait()

		r.sub.Steps++

		var hasErrors bool
		for _, r := range results {
			if r.Error != "" {
				hasErrors = true
				break
			}
		}

		if !hasErrors && len(results) > 0 {
			resultJSON, _ := json.Marshal(results)
			r.sub.Result = fmt.Sprintf("Sub-agent completed %d step(s).\nResults:\n%s", r.sub.Steps, string(resultJSON))
			r.sub.Status = "completed"
			now := time.Now()
			r.sub.CompletedAt = &now
			return
		}

		toolCalls = heuristicNextSteps(results, r.sub.Request.Task)
	}

	r.sub.Status = "completed"
	now := time.Now()
	r.sub.CompletedAt = &now
	if r.sub.Result == "" {
		r.sub.Result = "Sub-agent completed with no conclusive results"
	}
}

func (r *subAgentRunner) complete(result string, steps int) {
	r.sub.Result = result
	r.sub.Steps = steps
	r.sub.Status = "completed"
	now := time.Now()
	r.sub.CompletedAt = &now
	log.Printf("[sub-agent %s] completed in %d steps", r.sub.ID, steps)
}

func (r *subAgentRunner) fail(errMsg string) {
	r.sub.Error = errMsg
	r.sub.Status = "failed"
	now := time.Now()
	r.sub.CompletedAt = &now
	log.Printf("[sub-agent %s] failed: %s", r.sub.ID, errMsg)
}

func (r *subAgentRunner) getToolDefs() []model.ToolDefinition {
	if r.manager != nil {
		allTools := r.executor.Registry().List()
		scope := GetAgentConfig(r.sub.Request.AgentType).ToolScope
		if scope != nil {
			filtered := make([]api.ToolDefinition, 0, len(allTools))
			for _, t := range allTools {
				if FilterToolScope(scope, t.Name) {
					filtered = append(filtered, t)
				}
			}
			return ToolsToModelDefinitions(filtered)
		}
		return ToolsToModelDefinitions(allTools)
	}

	return []model.ToolDefinition{
		{Name: "web_search", Description: "Search the web for information", Parameters: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"query": map[string]any{"type": "string", "description": "Search query"},
			},
			"required": []string{"query"},
		}},
		{Name: "read_file", Description: "Read a file from the filesystem", Parameters: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{"type": "string", "description": "File path"},
			},
			"required": []string{"path"},
		}},
	}
}

func ToolsToModelDefinitions(tools []api.ToolDefinition) []model.ToolDefinition {
	defs := make([]model.ToolDefinition, 0, len(tools))
	for _, t := range tools {
		params := map[string]any{
			"type":       "object",
			"properties": make(map[string]any),
			"required":   make([]string, 0),
		}

		props := params["properties"].(map[string]any)
		var required []string

		for name, p := range t.Parameters {
			prop := map[string]any{
				"type":        p.Type,
				"description": p.Description,
			}
			if len(p.Enum) > 0 {
				prop["enum"] = p.Enum
			}
			props[name] = prop
			if p.Required {
				required = append(required, name)
			}
		}
		params["required"] = required

		defs = append(defs, model.ToolDefinition{
			Name:        t.Name,
			Description: t.Description,
			Parameters:  params,
		})
	}
	return defs
}

func heuristicPlan(taskDesc string, tools []api.ToolDefinition) []api.ToolCall {
	taskLower := taskDesc

	var calls []api.ToolCall

	if containsAny(taskLower, []string{
		"search", "find", "look up", "lookup", "research",
		"what", "how", "who", "when", "where", "why",
		"latest", "recent", "new", "news", "update", "current", "today", "now", "trends", "breaking",
		"explain", "define", "describe", "summarize", "elaborate", "details", "info", "information",
		"compare", "vs", "versus", "difference", "best", "top", "ranking", "list",
		"verify", "confirm", "check", "validate", "fact-check", "ensure", "correct", "accurate",
		"tutorial", "guide", "documentation", "docs", "how to", "example", "recipe",
		"troubleshoot", "debug", "fix", "issue", "problem", "error", "solution", "workaround",
		"status", "report", "background", "context", "overview", "breakdown",
		"source", "citation", "reference", "proof", "evidence",
		"method", "approach", "strategy", "technique",
	}) {
		calls = append(calls, api.ToolCall{
			Tool:   "web_search",
			Params: map[string]any{"query": taskDesc},
		})
	}

	if len(calls) == 0 {
		calls = append(calls, api.ToolCall{
			Tool:   "web_search",
			Params: map[string]any{"query": taskDesc},
		})
	}

	return calls
}

func heuristicNextSteps(previousResults []api.ToolCall, originalTask string) []api.ToolCall {
	return nil
}

func containsAny(s string, substrs []string) bool {
	for _, sub := range substrs {
		if containsFold(s, sub) {
			return true
		}
	}
	return false
}

func containsFold(s, substr string) bool {
	if len(substr) > len(s) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if toLower(s[i+j]) != toLower(substr[j]) {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

func toLower(c byte) byte {
	if c >= 'A' && c <= 'Z' {
		return c + 32
	}
	return c
}

func systemPrompt() string {
	return subagentSystemPrompt
}
