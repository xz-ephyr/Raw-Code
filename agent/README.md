# xz Agent Framework

A Go-based agent framework for the xz AI-native code editor. Handles sub-agent
orchestration, parallel tool execution, MCP integration, and background task
processing — offloading heavy work from the frontend and Express backend.

## Architecture

```
xz Frontend (React/Vite)
    │ HTTP POST /agent/run
    ▼
┌────────────────────────────────────────────────────────────┐
│              xz Agent Framework (Go, :3002)                  │
│                                                              │
│  ┌─ Orchestrator ──────────────────────────────────────┐   │
│  │  Routes tasks: direct | delegate | workflow           │   │
│  │  Manages sub-agent lifecycle                          │   │
│  │  Runs predefined workflow definitions                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Worker Pool (4 goroutines) ─────────────────────────┐   │
│  │  Processes queued tasks in parallel                    │   │
│  │  Each worker executes tool calls                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Tool Executor ──────────────────────────────────────┐   │
 │  │  web_search → Express /websearch proxy                │   │
 │  │  read_file / list_directory → local filesystem        │   │
│  │  delegate_task → sub-agent spawn                      │   │
│  │  run_workflow → workflow engine                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Sub-Agent Manager ──────────────────────────────────┐   │
│  │  Spawns isolated sub-agents for delegated tasks       │   │
│  │  Each has own tool scope and step limit               │   │
│  │  Parallel execution via goroutines                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ MCP Client ─────────────────────────────────────────┐   │
│  │  Connects to stdio MCP servers (Codex, Claude, etc.)  │   │
│  │  Discovers and exposes their tools dynamically        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ CLI Detection ──────────────────────────────────────┐   │
│  │  Detects installed AI coding CLIs via which/where     │   │
│  │  Reports binary path, version, config location        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
         │
    HTTP POST /websearch (delegates search to Express)
         ▼
┌────────────────────────────────────────────────────────────┐
│              Express Backend (Node.js, :3001)               │
│  SQLite, sessions, messages, web search providers           │
└────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Go 1.26+
- The xz Express backend running on `localhost:3001`

### Run

```bash
cd agent
go mod tidy
go run ./cmd/agent
```

The agent framework starts on `http://localhost:3002` by default. Override with:

```bash
AGENT_PORT=3003 EXPRESS_URL=http://localhost:3001 go run ./cmd/agent
```

### Build

```bash
make build
./build/xz-agent
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + status |
| GET | `/api/tools` | List registered tools (?category=research) |
| POST | `/api/tasks` | Submit a new task |
| GET | `/api/tasks/{id}` | Get task status and result |
| POST | `/api/tasks/{id}/cancel` | Cancel a running task |
| GET | `/api/tasks` | List all tasks (?sessionId=...) |
| GET | `/api/clis` | Detect installed AI coding CLIs |
| GET | `/api/clis/{name}` | Get info about a specific CLI |
| POST | `/api/chat` | Submit a chat message as a delegated task |
| GET | `/api/workflows` | List available workflow definitions |

## Task Types

### `direct` — Simple tool execution

Runs a set of tool calls through the worker pool. Best for well-defined
single-step operations.

```json
{
  "sessionId": "abc-123",
  "type": "direct",
  "prompt": "Search for xz documentation",
  "toolScope": ["research"]
}
```

### `delegate` — Sub-agent execution

Spawns a sub-agent that plans and executes its own tool calls autonomously.
The sub-agent has an isolated context and tool scope.

```json
{
  "sessionId": "abc-123",
  "type": "delegate",
  "prompt": "Research the top 5 AI coding agents and create a comparison",
  "model": "gemini-3.5-flash",
  "maxSteps": 10,
  "toolScope": ["research"]
}
```

### `workflow` — Predefined workflow

Runs a multi-step workflow defined in the orchestrator. Steps can pass
results between each other using `$variable` references.

```json
{
  "sessionId": "abc-123",
  "type": "research_and_summarize",
  "prompt": "Compare Codex CLI vs Antigravity CLI",
  "context": "Focus on 2026 features"
}
```

## CLI Detection

The framework detects which AI coding CLIs are installed on the system:

```bash
curl http://localhost:3002/api/clis
```

Response:
```json
{
  "clis": {
    "codex": "/usr/local/bin/codex (0.142.2)",
    "agy": "/opt/homebrew/bin/agy (1.2.0)",
    "claude": "/usr/local/bin/claude (0.8.0)"
  },
  "count": 3
}
```

## MCP Integration

The framework can connect to any MCP-compatible server:

```go
client := mcp.NewClient("my-server")
client.Connect(ctx, "npx", "-y", "@modelcontextprotocol/server-filesystem", "/path/to/project")
tools := client.GetTools()
result, _ := client.CallTool(ctx, "read_file", map[string]any{"path": "main.go"})
```

## Project Structure

```
agent/
├── cmd/agent/           # Entry point
│   ├── main.go          # Server bootstrap
│   └── hub.go           # Dependency wiring
├── internal/
│   ├── agent/           # Orchestrator & sub-agents
│   ├── infra/           # Express client & Tauri shell
│   ├── server/          # HTTP API server
│   ├── task/            # Task queue & lifecycle
│   ├── tool/            # Tool registry & executor
│   └── worker/          # Worker pool
├── pkg/
│   ├── api/             # Shared API types
│   └── mcp/             # MCP client (JSON-RPC)
├── Makefile
├── go.mod / go.sum
└── README.md
```
