package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
	"github.com/google/uuid"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type SubAgentRequest struct {
	Task      string   `json:"task"`
	Context   string   `json:"context,omitempty"`
	Model     string   `json:"model,omitempty"`
	ToolScope []string `json:"toolScope,omitempty"`
	MaxSteps  int      `json:"maxSteps,omitempty"`
}

type SubAgent struct {
	ID        string
	Request   SubAgentRequest
	Result    string
	Error     string
	Steps     int
	Status    string
	CreatedAt time.Time
	CompletedAt *time.Time
	done      chan struct{}
}

func (s *SubAgent) Wait() {
	<-s.done
}

type SubAgentManager struct {
	mu        sync.RWMutex
	agents    map[string]*SubAgent
	manager   *task.Manager
	executor  *tool.Executor
	httpClient *http.Client
}

func NewSubAgentManager(manager *task.Manager, executor *tool.Executor) *SubAgentManager {
	return &SubAgentManager{
		agents:     make(map[string]*SubAgent),
		manager:    manager,
		executor:   executor,
		httpClient: &http.Client{Timeout: 5 * time.Minute},
	}
}

func (sm *SubAgentManager) Spawn(ctx context.Context, req SubAgentRequest) (*SubAgent, error) {
	id := uuid.New().String()
	if req.MaxSteps <= 0 {
		req.MaxSteps = 10
	}
	if req.Model == "" {
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

	log.Printf("[sub-agent %s] starting: %.80s...", sub.ID, sub.Request.Task)

	// Execute tool calls based on the task and tool scope
	tools := sm.selectTools(sub.Request.ToolScope)
	toolCalls := sm.planToolCalls(sub.Request.Task, tools)

	var allResults []api.ToolCall
	for i := 0; i < sub.Request.MaxSteps; i++ {
		if len(toolCalls) == 0 {
			break
		}

		// Execute current batch in parallel
		var wg sync.WaitGroup
		results := make([]api.ToolCall, len(toolCalls))
		for j, tc := range toolCalls {
			wg.Add(1)
			go func(idx int, call api.ToolCall) {
				defer wg.Done()
				results[idx] = sm.executor.Execute(ctx, call)
			}(j, tc)
		}
		wg.Wait()

		allResults = append(allResults, results...)
		sub.Steps++

		// Check if results contain info sufficient to answer
		var hasErrors bool
		for _, r := range results {
			if r.Error != "" {
				hasErrors = true
				break
			}
		}

		// Simple heuristic: if no errors and we have results, we're done
		if !hasErrors && len(results) > 0 {
			// Synthesize results into a summary
			resultJSON, _ := json.Marshal(results)
			sub.Result = fmt.Sprintf("Sub-agent completed %d step(s).\nResults:\n%s", sub.Steps, string(resultJSON))
			sub.Status = "completed"
			now := time.Now()
			sub.CompletedAt = &now
			return
		}

		toolCalls = sm.planNextSteps(results, sub.Request.Task)
	}

	sub.Status = "completed"
	now := time.Now()
	sub.CompletedAt = &now
	if sub.Result == "" {
		sub.Result = "Sub-agent completed with no conclusive results"
	}
}

func (sm *SubAgentManager) selectTools(scope []string) []api.ToolDefinition {
	return []api.ToolDefinition{
		{Name: "web_search", Description: "Search the web"},
		{Name: "fetch_page", Description: "Fetch a webpage"},
		{Name: "code_search", Description: "Search codebase"},
		{Name: "read_file", Description: "Read a file"},
	}
}

func (sm *SubAgentManager) planToolCalls(taskDesc string, tools []api.ToolDefinition) []api.ToolCall {
	// Use simple heuristics to plan initial tool calls based on task description
	taskLower := taskDesc

	var calls []api.ToolCall

	if containsAny(taskLower, []string{"search", "find", "look up", "research", "what", "how", "who", "when", "where"}) {
		calls = append(calls, api.ToolCall{
			Tool:   "web_search",
			Params: map[string]any{"query": taskDesc},
		})
	}

	if containsAny(taskLower, []string{"code", "source", "function", "class", "implementation"}){
		calls = append(calls, api.ToolCall{
			Tool:   "code_search",
			Params: map[string]any{"pattern": taskDesc},
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

func (sm *SubAgentManager) planNextSteps(previousResults []api.ToolCall, originalTask string) []api.ToolCall {
	// Check if any result contains URLs that could be fetched for more detail
	for _, r := range previousResults {
		if r.Error == "" && r.Result != nil {
			if resultMap, ok := r.Result.(map[string]any); ok {
				if results, ok := resultMap["results"].([]any); ok {
					for _, res := range results {
						if resMap, ok := res.(map[string]any); ok {
							if url, ok := resMap["url"].(string); ok && url != "" {
								return []api.ToolCall{
									{
										Tool:   "fetch_page",
										Params: map[string]any{"url": url},
									},
								}
							}
						}
					}
				}
			}
		}
	}
	return nil
}

func containsAny(s string, substrs []string) bool {
	sLower := s
	for _, sub := range substrs {
		if containsFold(sLower, sub) {
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
