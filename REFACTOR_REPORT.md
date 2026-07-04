# Architecture Refactor Report: Transition to Three-Layer Architecture

## 1. Current-State Architecture Map

Currently, the codebase is split into three main parts:
- **src/**: React frontend containing UI components, but also heavily mixed with agent logic (prompts, model routing, tool definitions, and context management).
- **server/**: Node.js/Express backend that manages local SQLite storage and provides web search services.
- **agent/**: Go-based AI agent framework. It has a robust tool execution layer and an orchestrator, but it is currently used primarily as a tool-execution sidecar via `goProxy.ts`.

### Connection Points:
- `src/services/aiService.ts` handles model instantiation and the primary chat loop using Vercel AI SDK.
- `src/services/tools/goProxy.ts` forwards tool calls from the frontend to the Go agent at `http://localhost:3002`.
- `src/services/DatabaseService.ts` connects the frontend to the Express server at `http://localhost:3001`.

## 2. Folder-by-Folder Ownership Report

| Current Location | Responsibility | Target Layer |
| :--- | :--- | :--- |
| `src/components/` | UI Presentation | `src/app/components/` |
| `src/services/ai/config.ts` | System Prompts | `core/prompt/` |
| `src/services/ai/context*` | Context Management | `core/memory/` |
| `src/services/aiService.ts` | Model Routing & Fallbacks | `core/models/` |
| `src/services/tools/` | Tool Definitions (TS) | `core/tools/` |
| `src/config/models.ts` | Model Metadata | `core/config/` |
| `src/services/FileSystemService.ts` | Workspace Indexing Logic | `core/workspace/` |
| `agent/internal/tool/` | Tool Execution (Go) | `agent/` (Auth. Backend) |
| `server/` | Database & Search | `agent/` or `core/` (TBD) |

## 3. Problems & Sluggishness
- **Logic Duplication**: Tool definitions exist in both TypeScript (`src/services/tools/`) and Go (`agent/internal/tool/`).
- **Context Overload**: Recursive filesystem scanning in `FileSystemService.ts` is done on the frontend, which can be slow for large projects.
- **Fat Frontend**: The React app is responsible for orchestrating the AI loop, managing retries, and handling complex context contraction. This leads to a sluggish UI and fragile behavior.

## 4. Migration Plan

1.  **Phase 1: Establish Core Layer**: Create `core/` and move all "policy" code (prompts, model config, routing rules) out of `src/`.
2.  **Phase 2: Unify Tooling**: Move TypeScript tool schemas to `core/tools/` and ensure they align with Go implementations.
3.  **Phase 3: Shift Orchestration**: Move the chat completion and fallback logic to `core/`.
4.  **Phase 4: Workspace Optimization**: Move indexing and heavy filesystem operations from `src/` to `agent/` (Go) or `core/` (if TS is sufficient but decoupled).
5.  **Phase 5: Cleanup**: Thin out `src/` to be purely presentational.

## 5. Final Target Folder Structure

```
/
├── src/ (Frontend)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── store/
├── core/ (Control Plane - TS)
│   ├── prompt/
│   ├── models/
│   ├── tools/
│   ├── memory/
│   └── workspace/
└── agent/ (Execution Layer - Go)
    ├── cmd/
    ├── internal/orchestrator
    └── internal/executor
```

## 6. Role of Go `agent/`
The Go framework should be the **authoritative execution layer**. It will handle:
- All filesystem and shell operations.
- Parallel tool execution.
- Long-running tasks and orchestration that require high performance and concurrency.
- Workspace scanning and indexing (replacing the current TS implementation).
