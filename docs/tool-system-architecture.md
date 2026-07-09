# Tool System Architecture

## Problem

Should the AI model's tool system live in **TypeScript** (Vercel AI SDK, as the 5 existing tools do) or in **Go** (consistent with the agent framework)?

## Current State

```
Frontend (TypeScript)
│
├─ Vercel AI SDK streamText()
│   └─ 5 tools: writeArtifact, webSearch, fetchPage, imageSearch, newsSearch
│       └─ execute() runs CLIENT-SIDE in browser
│           ├─ writeArtifact → React state (updates artifact UI)
│           └─ webSearch etc → HTTP call to WebSearchService
│
└─ [no bridge yet] → Express (port 3001) → Go Agent (port 3002)
                                                └─ 25 tools in 5 categories
```

The AI model's tool loop runs entirely in `streamText()` — it generates tool call JSON, the client-side `execute()` runs, and results stream back. Adding a Go proxy means an HTTP round-trip *per tool call*, serializing params and results each time.

## Analysis

### TypeScript Tools

| Capability | How | Status |
|---|---|---|
| Web search, fetch page, image search | HTTP call to WebSearchService | ✅ 4 tools existing |
| Artifact rendering | Direct React state access | ✅ 1 tool existing |
| File read/write/search | Via Tauri `fs` APIs or Express backend | ⚠️ Needs bridge code |
| Git operations | Via Tauri `shell` plugin or Express | ⚠️ Needs bridge code |
| Run shell commands | Via Tauri `shell:allow-spawn` | ⚠️ Needs bridge code |
| Sub-agent delegation | HTTP call to Go agent | ⚠️ Needs API client |
| Workflow execution | HTTP call to Go agent | ⚠️ Needs API client |

### Go Tools (already built)

```
search/        code/           action/
├─ web_search  ├─ read_file    ├─ run_command
├─ search_codebase├─ write_file├─ write_artifact
               ├─ edit_file   └─ subagent_run
               └─ list_directory
```

These tools:
- Have full filesystem access (Go runs as a local process)
- Have full shell access (`exec.CommandContext`)
- Use goroutines for parallelism
- Already compile and run

## Recommendation: Two-Layer Architecture

**Model-facing tools in TypeScript** — the AI model sees these when calling `streamText()`.

**Orchestration tools in Go** — sub-agents and workflows run here.

### Layer 1: TypeScript Tools (Model-Facing)

The model calls these via `streamText()`. Each tool either:
- **Resolves directly** (web search, fetch page — thin HTTP calls, no bridge needed)
- **Delegates to Tauri** (file ops, git, shell — through Tauri's `fs` and `shell` plugins)
- **Delegates to Go agent** (sub-agent tasks, workflow runs, MCP calls)

```
TS Tool (model sees this in streamText)
│
├─ execute() → direct API call (e.g. WebSearchService.search)
│
├─ execute() → Tauri API (e.g. invoke('read_file', { path }))
│
└─ execute() → HTTP → Go Agent (e.g. POST /api/tasks for delegate_task)
                         └─ Go executor runs the actual work
```

**Why not route everything through Go?**

1. **Latency**: Every TS→Go tool call adds ~1-5ms HTTP overhead *per step* of the AI's tool loop. For a 6-step conversation with 3 tool calls each, that's 18 HTTP round-trips.
2. **Web search tools already work** in TypeScript — duplicating them in Go or proxying to Go adds zero value.
3. **Artifact rendering** needs direct React state access — can't be done in Go.

**Why not build everything in TypeScript?**

1. **Browser sandbox**: Can't run `git`, `sh`, `grep`, or access the filesystem directly without Tauri bridges.
2. **Sub-agent spawning**: The Go orchestrator runs goroutines with per-step planning and tool selection — building this in the browser is far more complex.
3. **Parallel execution**: JavaScript is single-threaded; Go's worker pool handles concurrent tool execution efficiently.

### Implementation Plan

#### Phase 1: Add Tauri-backed TypeScript Tools (filesystem/git/shell)

Create new TS tools that use Tauri's `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-shell`, etc.:

| New TS Tool | Backend | Existing Go Tool |
|---|---|---|
| `readFile` | Tauri fs | `read_file.go` |
| `writeFile` | Tauri fs | `write_file.go` |
| `editFile` | Tauri fs | `edit_file.go` |
| `listDirectory` | Tauri fs | `list_directory.go` |
| `findFiles` | Tauri fs | `find_files.go` |
| `grepFiles` | Tauri fs/run | `grep_files.go` |
| `codeSearch` | Tauri fs | `code_search.go` |
| `gitStatus` | Tauri shell | `git_status.go` |
| `gitDiff` | Tauri shell | `git_diff.go` |
| `gitLog` | Tauri shell | `git_log.go` |
| `runCommand` | Tauri shell | `run_command.go` |

These TS tools are **thin stubs** — they define the schema (so the model knows how to call them) and delegate execution to Tauri. The actual heavy lifting is done by Tauri's Rust backend or shell.

Add a `toolCategory` to each for model routing (capacity limits per model per category).

#### Phase 2: Add Go-proxy TypeScript Tools (delegate/workflow)

| New TS Tool | What it does | Backend |
|---|---|---|
| `delegateTask` | Spawn a sub-agent | HTTP → Go agent `/api/tasks` |
| `runWorkflow` | Run a predefined workflow | HTTP → Go agent `/api/workflows` |

These call the Go agent's REST API asynchronously, then poll for completion.

#### Phase 3: Register All Tools with streamText()

```typescript
// src/services/aiService.ts

return streamText({
  model: currentModel,
  system: fullSystemPrompt,
  messages: filteredMessages,
  tools: {
    // Direct tools (existing)
    writeArtifact: writeArtifactTool,
    webSearch: webSearchTool,
    fetchPage: fetchPageTool,
    imageSearch: imageSearchTool,
    newsSearch: newsSearchTool,

    // Tauri-backed tools (new)
    readFile: readFileTool,
    writeFile: writeFileTool,
    editFile: editFileTool,
    listDirectory: listDirectoryTool,
    findFiles: findFilesTool,
    grepFiles: grepFilesTool,
    codeSearch: codeSearchTool,
    gitStatus: gitStatusTool,
    gitDiff: gitDiffTool,
    gitLog: gitLogTool,
    runCommand: runCommandTool,

    // Go-proxy tools (new)
    delegateTask: delegateTaskTool,
    runWorkflow: runWorkflowTool,
  },
  maxSteps: 6,
});
```

#### Phase 4: Conditionally Add Tools Based on Environment

In the browser (dev mode), web-only tools work. In Tauri, all tools work. In pure web (Electron?), filesystem/git tools return errors.

```typescript
const tools: Record<string, Tool> = {};
if (isTauri()) {
  Object.assign(tools, {
    readFile: readFileTool,
    writeFile: writeFileTool,
    // ...
  });
}
if (goAgentAvailable) {
  Object.assign(tools, {
    delegateTask: delegateTaskTool,
    runWorkflow: runWorkflowTool,
  });
}
```

## Why Not All-in-Go?

A pure Go approach would mean:

1. `streamText()` only has **one** tool: `callGoAgent` that passes the entire conversation to Go
2. The Go agent runs its own LLM loop with tool execution
3. Streamed responses are sent back to TypeScript as text

This duplicates the Vercel AI SDK's built-in tool loop, loses streaming UX (no progressive token rendering), and adds complexity for no benefit — the TS tools that are already written (web search, artifacts) work perfectly as-is.

## Why Not All-in-TypeScript?

The browser sandbox is the hard blocker. Even with Tauri, bridging to Rust/shell adds similar complexity to bridging to Go. Since we already have a fully functional Go agent with 25 tools, a sub-agent manager, workflow engine, and MCP client, **leverage it** for what it's good at.

## Summary

| Layer | Language | Purpose | Tools |
|---|---|---|---|
| Model-Facing | TypeScript | Fast tool loop, direct UI access, Tauri bridges | 17 tools (5 existing + 12 new) |
| Orchestration | Go | Heavy processing, sub-agents, parallelism, MCP | 25 tools (reuse existing) |

The Go agent's 25 tools stay in Go — they power sub-agents and workflows. The TypeScript tool layer grows from 5 to ~17, covering the same capabilities but as thin stubs that either call Tauri APIs or the Go agent.
