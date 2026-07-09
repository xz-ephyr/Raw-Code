package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/xz-ephyr/raw-code/agent/internal/model"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
	"github.com/xz-ephyr/raw-code/agent/internal/worker"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Orchestrator struct {
	manager     *task.Manager
	registry    *tool.Registry
	executor    *tool.Executor
	pool        *worker.Pool
	subAgents   *SubAgentManager
	modelClient model.ModelProvider
	mu          sync.RWMutex
	workflows   map[string]WorkflowDef
}

type WorkflowDef struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Steps       []WorkflowStep `json:"steps"`
}

type WorkflowStep struct {
	Tool   string         `json:"tool"`
	Params map[string]any `json:"params"`
	Output string         `json:"output,omitempty"`
	Map    map[string]string `json:"map,omitempty"`
}

func NewOrchestrator(manager *task.Manager, registry *tool.Registry, executor *tool.Executor, pool *worker.Pool, modelClient model.ModelProvider) *Orchestrator {
	return &Orchestrator{
		manager:     manager,
		registry:    registry,
		executor:    executor,
		pool:        pool,
		modelClient: modelClient,
		subAgents:   NewSubAgentManager(manager, executor, modelClient),
		workflows:   make(map[string]WorkflowDef),
	}
}

func (o *Orchestrator) SubmitTask(req api.TaskRequest) *task.Task {
	t := task.NewTask(req)

	switch req.Type {
	case "direct":
		o.manager.Submit(t)
		o.pool.Submit(t)

	case "delegate":
		o.manager.Submit(t)
		go o.runDelegatedTask(t)

	case "decompose":
		o.manager.Submit(t)
		go o.runDecomposedTask(t)

	case "workflow":
		o.manager.Submit(t)
		go o.runWorkflowTask(t)

	default:
		o.manager.Submit(t)
		o.pool.Submit(t)
	}

	return t
}

func (o *Orchestrator) runDelegatedTask(t *task.Task) {
	log.Printf("[orchestrator] starting delegated task %s: %s", t.ID, t.Prompt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	sub, err := o.subAgents.Spawn(ctx, SubAgentRequest{
		Task:      t.Prompt,
		Context:   t.Context,
		Model:     t.Model,
		ToolScope: t.ToolScope,
		MaxSteps:  t.MaxSteps,
		AgentType: t.AgentType,
	})
	if err != nil {
		o.manager.Fail(t.ID, fmt.Sprintf("sub-agent spawn failed: %v", err))
		return
	}

	sub.Wait()

	if sub.Error != "" {
		o.manager.Fail(t.ID, sub.Error)
	} else {
		o.manager.Complete(t.ID, sub.Result, sub.Steps)
	}
}

func (o *Orchestrator) runDecomposedTask(t *task.Task) {
	log.Printf("[orchestrator] decomposing task %s: %s", t.ID, t.Prompt)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	if o.modelClient == nil {
		log.Printf("[orchestrator] no model client for decomposition, falling back to delegate for task %s", t.ID)
		o.runDelegatedTask(t)
		return
	}

	subtasks, err := o.decomposeTask(ctx, t.Prompt, t.Context)
	if err != nil {
		log.Printf("[orchestrator] decomposition failed for %s: %v, falling back to delegate", t.ID, err)
		o.runDelegatedTask(t)
		return
	}

	log.Printf("[orchestrator] task %s decomposed into %d subtasks", t.ID, len(subtasks))

	results := make([]string, len(subtasks))
	var wg sync.WaitGroup

	for i, st := range subtasks {
		wg.Add(1)
		go func(idx int, subtaskDesc string) {
			defer wg.Done()

			sub, err := o.subAgents.Spawn(ctx, SubAgentRequest{
				Task:     subtaskDesc,
				Context:  t.Context,
				Model:    t.Model,
				MaxSteps: t.MaxSteps / len(subtasks),
			})
			if err != nil {
				results[idx] = fmt.Sprintf("Subtask %d failed: %v", idx+1, err)
				return
			}

			sub.Wait()
			if sub.Error != "" {
				results[idx] = fmt.Sprintf("Subtask %d failed: %s", idx+1, sub.Error)
			} else {
				results[idx] = sub.Result
			}
		}(i, st)
	}

	// Use a channel so we can select on wait completion vs. context timeout.
	waitDone := make(chan struct{}, 1)
	go func() {
		wg.Wait()
		waitDone <- struct{}{}
	}()
	select {
	case <-waitDone:
	case <-ctx.Done():
		completed := 0
		for _, r := range results {
			if r != "" {
				completed++
			}
		}
		log.Printf("[orchestrator] decompose task %s timed out — returning partial results (%d/%d tasks)", t.ID, completed, len(subtasks))
	}

	summary := o.synthesizeResults(ctx, t.Prompt, results)

	o.manager.Complete(t.ID, summary, len(subtasks))
}

func (o *Orchestrator) decomposeTask(ctx context.Context, taskDesc string, contextStr string) ([]string, error) {
	prompt := fmt.Sprintf(`Break down the following task into 2-4 independent subtasks that can be executed in parallel.

Task: %s

For each subtask, provide a clear, self-contained description that includes:
- What information to gather or what action to take
- Any specific tools or approaches to use

Return ONLY a JSON array of strings, one per subtask. Example:
["Subtask 1 description", "Subtask 2 description", "Subtask 3 description"]`, taskDesc)

	if contextStr != "" {
		prompt += "\n\nContext:\n" + contextStr
	}

	messages := []model.Message{
		{Role: "system", Content: "You are a task decomposition expert. Break complex tasks into independent parallel subtasks."},
		{Role: "user", Content: prompt},
	}

	resp, err := o.modelClient.ChatCompletion(ctx, model.ChatRequest{
		Messages: messages,
	})
	if err != nil {
		return nil, fmt.Errorf("decomposition LLM call failed: %w", err)
	}

	var subtasks []string
	content := resp.Content

	content = stripMarkdownJSON(content)

	if err := json.Unmarshal([]byte(content), &subtasks); err != nil {
		if err := json.Unmarshal([]byte("["+content+"]"), &subtasks); err != nil {
			return []string{taskDesc}, nil
		}
	}

	if len(subtasks) == 0 {
		return []string{taskDesc}, nil
	}

	return subtasks, nil
}

func (o *Orchestrator) synthesizeResults(ctx context.Context, originalTask string, results []string) string {
	if o.modelClient == nil {
		combined := fmt.Sprintf("Task: %s\n\nResults:\n", originalTask)
		for i, r := range results {
			combined += fmt.Sprintf("\n--- Subtask %d ---\n%s", i+1, r)
		}
		return combined
	}

	prompt := fmt.Sprintf(`Synthesize the following parallel subtask results into a comprehensive answer for the original task.

Original Task: %s

Subtask Results:`, originalTask)

	for i, r := range results {
		prompt += fmt.Sprintf("\n\n--- Subtask %d ---\n%s", i+1, r)
	}

	prompt += "\n\nProvide a well-organized final answer that combines all findings."

	messages := []model.Message{
		{Role: "system", Content: "You synthesize parallel research results into coherent answers."},
		{Role: "user", Content: prompt},
	}

	resp, err := o.modelClient.ChatCompletion(ctx, model.ChatRequest{
		Messages: messages,
	})
	if err != nil {
		combined := fmt.Sprintf("Task: %s\n\nResults:\n", originalTask)
		for i, r := range results {
			combined += fmt.Sprintf("\n--- Subtask %d ---\n%s", i+1, r)
		}
		return combined
	}

	return resp.Content
}

func stripMarkdownJSON(s string) string {
	start := 0
	end := len(s)

	for start < len(s) && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}

	if start+3 <= len(s) && s[start:start+3] == "```" {
		start += 3
		for start < len(s) && s[start] != '\n' {
			start++
		}
		for start < len(s) && (s[start] == '\n' || s[start] == '\r') {
			start++
		}
	}

	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}

	if end >= 3 && s[end-3:end] == "```" {
		end -= 3
		for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
			end--
		}
	}

	if start < end {
		return s[start:end]
	}
	return ""
}

func (o *Orchestrator) runWorkflowTask(t *task.Task) {
	log.Printf("[orchestrator] starting workflow task %s", t.ID)

	workflowName := t.Prompt
	if workflowName == "" {
		workflowName = t.Type
	}

	o.mu.RLock()
	wf, ok := o.workflows[workflowName]
	o.mu.RUnlock()

	if !ok {
		o.manager.Fail(t.ID, fmt.Sprintf("unknown workflow: %s", workflowName))
		return
	}

	ctx := context.Background()
	stepResults := make(map[string]any)

	// Resolve initial variables from task context (JSON)
	contextVars := make(map[string]any)
	if t.Context != "" {
		json.Unmarshal([]byte(t.Context), &contextVars)
	}
	for k, v := range t.Metadata {
		contextVars[k] = v
	}

	for i, step := range wf.Steps {
		params := make(map[string]any)
		for k, v := range step.Params {
			params[k] = v
		}

		for k, v := range params {
			if str, ok := v.(string); ok {
				// Resolve from context vars first
				for key, val := range contextVars {
					str = resolveVar(str, key, val)
				}
				// Then from previous step results
				for key, val := range stepResults {
					str = resolveVar(str, key, val)
				}
				params[k] = str
			}
		}

		// Check for unresolved placeholder variables (e.g. "$url")
		hasUnresolved := false
		for k, v := range params {
			if str, ok := v.(string); ok && hasUnresolvedPlaceholders(str) {
				log.Printf("[orchestrator] step %d (%s): param %q has unresolved placeholder %q — skipping step", i+1, step.Tool, k, str)
				hasUnresolved = true
				break
			}
		}
		if hasUnresolved {
			continue
		}

		call := api.ToolCall{
			Tool:   step.Tool,
			Params: params,
		}
		result := o.executor.Execute(ctx, call)
		if result.Error != "" {
			o.manager.Fail(t.ID, fmt.Sprintf("step %d (%s) failed: %s", i+1, step.Tool, result.Error))
			return
		}
		stepResults[step.Tool] = result.Result

		if step.Output != "" {
			stepResults[step.Output] = result.Result
		}

		// Extract mapped values from step result into stepResults
		for varName, path := range step.Map {
			val, ok := getNestedValue(result.Result, path)
			if ok {
				stepResults[varName] = val
				log.Printf("[orchestrator] step %d: mapped %s = %q from %s", i+1, varName, val, path)
			} else {
				log.Printf("[orchestrator] step %d: could not extract %s from path %q", i+1, varName, path)
			}
		}
	}

	resultJSON, _ := json.Marshal(stepResults)
	o.manager.Complete(t.ID, string(resultJSON), len(wf.Steps))
}

func resolveVar(template string, key string, val any) string {
	str := fmt.Sprintf("%v", val)
	result := ""
	for i := 0; i < len(template); i++ {
		if template[i] == '$' {
			end := i + 1
			for end < len(template) && (isAlpha(template[end]) || template[end] == '_' || template[end] == '.') {
				end++
			}
			if end > i+1 {
				varName := template[i+1 : end]
				if varName == key {
					result += str
					i = end - 1
					continue
				}
			}
		}
		result += string(template[i])
	}
	return result
}

func isAlpha(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')
}

func hasUnresolvedPlaceholders(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] == '$' && i+1 < len(s) && isAlpha(s[i+1]) {
			return true
		}
	}
	return false
}

func getNestedValue(obj any, path string) (any, bool) {
	current := obj
	parts := strings.Split(path, ".")
	for _, part := range parts {
		if current == nil {
			return nil, false
		}
		// Handle array index access like "results[0]"
		if bracketIdx := strings.Index(part, "["); bracketIdx >= 0 {
			key := part[:bracketIdx]
			if key != "" {
				m, ok := current.(map[string]any)
				if !ok {
					return nil, false
				}
				current = m[key]
				if current == nil {
					return nil, false
				}
			}
			// Parse array indices like [0][1]
			rest := part[bracketIdx:]
			for rest != "" {
				if rest[0] != '[' {
					return nil, false
				}
				end := strings.Index(rest, "]")
				if end < 0 {
					return nil, false
				}
				idx, err := strconv.Atoi(rest[1:end])
				if err != nil {
					return nil, false
				}
				arr, ok := current.([]any)
				if !ok || idx < 0 || idx >= len(arr) {
					return nil, false
				}
				current = arr[idx]
				rest = rest[end+1:]
			}
		} else {
			m, ok := current.(map[string]any)
			if !ok {
				return nil, false
			}
			current = m[part]
		}
	}
	return current, current != nil
}

func (o *Orchestrator) RegisterWorkflow(def WorkflowDef) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.workflows[def.Name] = def
	log.Printf("workflow registered: %s (%d steps)", def.Name, len(def.Steps))
}

func (o *Orchestrator) SubAgentManager() *SubAgentManager {
	return o.subAgents
}

// RunSubTasks spawns one sub-agent per task description, waits for all to
// complete (in parallel), synthesises the results into a single summary, and
// then summarises the synthesised result.  This is the public entry-point used
// by the hub so that subagent_run with a `tasks` array does not need to go
// through the full Task/Manager path.
func (o *Orchestrator) RunSubTasks(ctx context.Context, subtaskDescs []string, contextStr, modelStr string, maxStepsPerTask, depth int) string {
	if len(subtaskDescs) == 0 {
		return ""
	}

	// Use a timeout context so a hung sub-agent cannot block indefinitely.
	runCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	results := make([]string, len(subtaskDescs))
	var wg sync.WaitGroup

	for i, desc := range subtaskDescs {
		wg.Add(1)
		go func(idx int, taskDesc string) {
			defer wg.Done()

			sub, err := o.subAgents.Spawn(runCtx, SubAgentRequest{
				Task:      taskDesc,
				Context:   contextStr,
				Model:     modelStr,
				MaxSteps:  maxStepsPerTask,
				Depth:     depth + 1,
			})
			if err != nil {
				results[idx] = fmt.Sprintf("Subtask %d failed: %v", idx+1, err)
				return
			}

			// Wait with context awareness: if the context was cancelled
			// (timeout) we bail out instead of blocking on sub.Wait().
			done := make(chan struct{}, 1)
			go func() {
				sub.Wait()
				done <- struct{}{}
			}()
			select {
			case <-done:
			case <-runCtx.Done():
				results[idx] = fmt.Sprintf("Subtask %d timed out", idx+1)
				return
			}

			if sub.Error != "" {
				results[idx] = fmt.Sprintf("Subtask %d failed: %s", idx+1, sub.Error)
			} else {
				results[idx] = sub.Result
			}
		}(i, desc)
	}

	wg.Wait()

	// Synthesise raw results via LLM.
	var fullTask string
	if len(subtaskDescs) == 1 {
		fullTask = subtaskDescs[0]
	} else {
		fullTask = fmt.Sprintf("Parallel tasks: %s", strings.Join(subtaskDescs, "; "))
	}
	synthesised := o.synthesizeResults(runCtx, fullTask, results)

	// Apply summarisation (same pattern as subagent's complete()).
	if o.modelClient != nil {
		summPrompt := fmt.Sprintf(`Summarise the following in 1-3 sentences. What was done and what was the key finding or outcome?

Full result:
%s`, synthesised)
		summMsgs := []model.Message{
			{Role: "system", Content: "You produce concise 1-3 sentence summaries. No commentary, no markdown, no headings."},
			{Role: "user", Content: summPrompt},
		}
		summResp, err := o.modelClient.ChatCompletion(context.Background(), model.ChatRequest{
			Messages: summMsgs,
		})
		if err == nil && summResp.Content != "" {
			return summResp.Content
		}
		// fall through to raw synthesised result on error
	}

	return synthesised
}

func (o *Orchestrator) RegisterDefaultWorkflows() {
	o.RegisterWorkflow(WorkflowDef{
		Name:        "research_and_summarize",
		Description: "Search the web for information on a topic and create a markdown summary",
		Steps: []WorkflowStep{
			{Tool: "web_search", Params: map[string]any{"query": "$topic"}},
		},
	})
}
