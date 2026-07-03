package main

import (
	"net/http"
	"github.com/xz-ephyr/raw-code/agent/internal/agent"
	"github.com/xz-ephyr/raw-code/agent/internal/infra"
	"github.com/xz-ephyr/raw-code/agent/internal/server"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
	"github.com/xz-ephyr/raw-code/agent/internal/worker"
)

type AgentHub struct {
	TaskManager  *task.Manager
	ToolRegistry *tool.Registry
	Executor     *tool.Executor
	Pool         *worker.Pool
	Orchestrator *agent.Orchestrator
	Express      *infra.ExpressClient
	Tauri        *infra.TauriShell
	Server       *server.Server
}

func NewAgentHub(expressURL string, apiKey string) *AgentHub {
	// Infrastructure
	express := infra.NewExpressClient(expressURL)
	tauri := infra.NewTauriShell()

	// Core
	tm := task.NewManager()
	reg := tool.NewRegistry()
	reg.RegisterDefaults()
	exec := tool.NewExecutor(reg, expressURL)

	// Worker pool
	pool := worker.NewPool(4, tm, exec)

	// Orchestrator
	orch := agent.NewOrchestrator(tm, reg, exec, pool)
	orch.RegisterDefaultWorkflows()

	// HTTP server
	srv := server.New(tm, reg, exec, pool, orch, express, tauri, apiKey, 4)

	hub := &AgentHub{
		TaskManager:  tm,
		ToolRegistry: reg,
		Executor:     exec,
		Pool:         pool,
		Orchestrator: orch,
		Express:      express,
		Tauri:        tauri,
		Server:       srv,
	}

	// Start the worker pool
	pool.Start()

	return hub
}

func (h *AgentHub) Listen(port string) *http.Server {
	addr := ":" + port
	return h.Server.Listen(addr)
}
