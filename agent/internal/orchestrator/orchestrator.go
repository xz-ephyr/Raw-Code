package orchestrator

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tools"
	"github.com/xz-ephyr/raw-code/agent/internal/executor"
	"github.com/xz-ephyr/raw-code/agent/internal/worker"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Orchestrator struct {
	manager     *task.Manager
	registry    *tools.Registry
	executor    *executor.Executor
	pool        *worker.Pool
	subAgents   *SubAgentManager
	mu          sync.RWMutex
	workflows   map[string]WorkflowDef
}

type WorkflowDef struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Steps       []WorkflowStep `json:"steps"`
}

type WorkflowStep struct {
	Tool   string         `json:"tool"`
	Params map[string]any `json:"params"`
	Output string         `json:"output,omitempty"`
	Map    map[string]string `json:"map,omitempty"`
}

func NewOrchestrator(manager *task.Manager, registry *tools.Registry, executor *executor.Executor, pool *worker.Pool) *Orchestrator {
	return &Orchestrator{
		manager:   manager,
		registry:  registry,
		executor:  executor,
		pool:      pool,
		subAgents: NewSubAgentManager(manager, executor),
		workflows: make(map[string]WorkflowDef),
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

func (o *Orchestrator) runWorkflowTask(t *task.Task) {
	log.Printf("[orchestrator] starting workflow task %s", t.ID)

	o.mu.RLock()
	wf, ok := o.workflows[t.Type]
	o.mu.RUnlock()

	if !ok {
		o.manager.Fail(t.ID, fmt.Sprintf("unknown workflow: %s", t.Type))
		return
	}

	ctx := context.Background()
	stepResults := make(map[string]any)

	for i, step := range wf.Steps {
		params := make(map[string]any)
		for k, v := range step.Params {
			params[k] = v
		}

		// Substitute $variables from previous step results
		for k, v := range params {
			if str, ok := v.(string); ok {
				for key, val := range stepResults {
					str = resolveVar(str, key, val)
				}
				params[k] = str
			}
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

func (o *Orchestrator) RegisterWorkflow(def WorkflowDef) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.workflows[def.Name] = def
	log.Printf("workflow registered: %s (%d steps)", def.Name, len(def.Steps))
}

func (o *Orchestrator) RegisterDefaultWorkflows() {
	o.RegisterWorkflow(WorkflowDef{
		Name:        "research_and_summarize",
		Description: "Search the web for information on a topic and create a markdown summary",
		Steps: []WorkflowStep{
			{Tool: "web_search", Params: map[string]any{"query": "$topic"}},
			{Tool: "fetch_page", Params: map[string]any{"url": "$url"}},
		},
	})
	o.RegisterWorkflow(WorkflowDef{
		Name:        "codebase_audit",
		Description: "Search codebase for patterns and report findings",
		Steps: []WorkflowStep{
			{Tool: "code_search", Params: map[string]any{"pattern": "$pattern"}},
			{Tool: "read_file", Params: map[string]any{"path": "$path"}},
		},
	})
}
