package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/xz-ephyr/raw-code/agent/internal/agent"
	"github.com/xz-ephyr/raw-code/agent/internal/infra"
	"github.com/xz-ephyr/raw-code/agent/internal/model"
	"github.com/xz-ephyr/raw-code/agent/internal/server"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
	"github.com/xz-ephyr/raw-code/agent/internal/worker"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type AgentHub struct {
	TaskManager   *task.Manager
	ToolRegistry  *tool.Registry
	Executor      *tool.Executor
	Pool          *worker.Pool
	Orchestrator  *agent.Orchestrator
	Express       *infra.ExpressClient
	Tauri         *infra.TauriShell
	ModelClient   model.ModelProvider
	AgentServer   *server.Server
	ProviderReg   *model.ProviderRegistry
}

func NewAgentHub(expressURL string, apiKey string, providerReg *model.ProviderRegistry, projectRoot string) *AgentHub {
	express := infra.NewExpressClient(expressURL)
	tauri := infra.NewTauriShell()

	tm := task.NewManager()
	reg := tool.NewRegistry()
	reg.RegisterDefaults()
	exec := tool.NewExecutor(reg, expressURL, projectRoot)
	exec.ConfirmWrites = true

	pool := worker.NewPool(4, tm, exec)

	var mc model.ModelProvider
	if providerReg != nil && len(providerReg.AvailableIDs()) > 0 {
		mc = model.NewRouterClient(providerReg)
	}

	orch := agent.NewOrchestrator(tm, reg, exec, pool, mc)
	orch.RegisterDefaultWorkflows()

	// Register subagent_run tool (needs orchestrator reference, so done here via closure)
	reg.Register(api.ToolDefinition{
		Name:        "subagent_run",
		Description: "Spawn a sub-agent to handle a complex multi-step task. The sub-agent gets its own LLM tool-calling loop and can execute multiple tool calls autonomously. Use this for tasks that require multiple steps, research, or code changes that a single tool call cannot handle.",
		Category:    "agent",
		Parameters: map[string]api.ParamDef{
			"task":      {Type: "string", Description: "The task description for the sub-agent", Required: true},
			"context":   {Type: "string", Description: "Optional context or background information", Required: false},
			"model":     {Type: "string", Description: "Optional model override for the sub-agent", Required: false},
			"maxSteps":  {Type: "number", Description: "Maximum steps for the sub-agent loop (default 10)", Required: false},
			"toolScope": {Type: "array", Description: "Optional list of tool names to restrict the sub-agent to", Required: false},
			"agentType": {Type: "string", Description: "Optional agent type for the sub-agent (e.g. 'debug', 'teamwork', 'strategy-auditor')", Required: false},
		},
	}, func(ctx context.Context, e *tool.Executor, params map[string]any) (any, error) {
		taskStr, _ := params["task"].(string)
		tasksRaw := params["tasks"]

		// Mode 2: parallel tasks array (decompose-style execution).
		if tasksArr, ok := tasksRaw.([]any); ok && len(tasksArr) > 0 {
			subtaskDescs := make([]string, 0, len(tasksArr))
			for _, t := range tasksArr {
				if s, ok := t.(string); ok {
					subtaskDescs = append(subtaskDescs, s)
				}
			}
			if len(subtaskDescs) == 0 {
				return nil, fmt.Errorf("tasks array is empty or contains non-string items")
			}

			contextStr, _ := params["context"].(string)
			modelStr, _ := params["model"].(string)
			maxSteps := 10
			if v, ok := params["maxSteps"].(float64); ok {
				maxSteps = int(v)
			}
			if maxSteps > 50 {
				maxSteps = 50
			}
			depth := 0
			if v, ok := params["_depth"].(float64); ok {
				depth = int(v)
			}

			summary := orch.RunSubTasks(ctx, subtaskDescs, contextStr, modelStr, maxSteps, depth)
			return map[string]any{
				"result": summary,
				"steps":  len(subtaskDescs),
				"mode":   "parallel",
			}, nil
		}

		// Mode 1: single task (standard behaviour).
		if taskStr == "" {
			return nil, fmt.Errorf("task is required when tasks array is not provided")
		}
		contextStr, _ := params["context"].(string)
		modelStr, _ := params["model"].(string)
		agentType, _ := params["agentType"].(string)
		maxSteps := 10
		if v, ok := params["maxSteps"].(float64); ok {
			maxSteps = int(v)
		}
		if maxSteps > 50 {
			maxSteps = 50
		}
		depth := 0
		if v, ok := params["_depth"].(float64); ok {
			depth = int(v)
		}
		var toolScope []string
		if ts, ok := params["toolScope"].([]any); ok {
			for _, t := range ts {
				if s, ok := t.(string); ok {
					toolScope = append(toolScope, s)
				}
			}
		}

		sub, err := orch.SubAgentManager().Spawn(ctx, agent.SubAgentRequest{
			Task:      taskStr,
			Context:   contextStr,
			Model:     modelStr,
			ToolScope: toolScope,
			MaxSteps:  maxSteps,
			AgentType: agentType,
			Depth:     depth,
		})
		if err != nil {
			return nil, fmt.Errorf("sub-agent spawn failed: %w", err)
		}

		sub.Wait()

		if sub.Error != "" {
			return nil, fmt.Errorf("sub-agent failed: %s", sub.Error)
		}

		return map[string]any{
			"result": sub.Result,
			"steps":  sub.Steps,
			"mode":   "single",
		}, nil
	})

	srv := server.New(tm, reg, exec, pool, orch, express, tauri, mc, apiKey, 4)

	hub := &AgentHub{
		TaskManager:  tm,
		ToolRegistry: reg,
		Executor:     exec,
		Pool:         pool,
		Orchestrator: orch,
		Express:      express,
		Tauri:        tauri,
		ModelClient:  mc,
		AgentServer:  srv,
		ProviderReg:  providerReg,
	}

	pool.Start()

	return hub
}

func (h *AgentHub) SetupServer(port string) *http.Server {
	return h.AgentServer.Listen(":" + port)
}
