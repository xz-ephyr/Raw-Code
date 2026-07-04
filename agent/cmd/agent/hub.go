package main

import (
	"github.com/xz-ephyr/raw-code/agent/internal/orchestrator"
	"github.com/xz-ephyr/raw-code/agent/internal/infra"
	"github.com/xz-ephyr/raw-code/agent/internal/server"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tools"
	"github.com/xz-ephyr/raw-code/agent/internal/executor"
	"github.com/xz-ephyr/raw-code/agent/internal/worker"
)

type AgentHub struct {
	TaskManager  *task.Manager
	ToolRegistry *tools.Registry
	Executor     *executor.Executor
	Pool         *worker.Pool
	Orchestrator *orchestrator.Orchestrator
	Express      *infra.ExpressClient
	Tauri        *infra.TauriShell
	HttpServer   *server.Server
}

func NewAgentHub(expressURL string, apiKey string) *AgentHub {
	// Infrastructure
	express := infra.NewExpressClient(expressURL)
	tauri := infra.NewTauriShell()

	// Core
	tm := task.NewManager()
	reg := tools.NewRegistry()
	reg.RegisterDefaults()
	exec := executor.NewExecutor(reg, expressURL)

	// Worker pool
	pool := worker.NewPool(4, tm, exec)

	// Orchestrator
	orch := orchestrator.NewOrchestrator(tm, reg, exec, pool)
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
		HttpServer:   srv,
	}

	// Start the worker pool
	pool.Start()

	return hub
}
