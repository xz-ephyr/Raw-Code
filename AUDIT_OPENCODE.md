# Architecture Audit: Raw-Code (xz) Repository

**Date:** 2026-07-07
**Auditor:** Staff Engineer (Automated)
**Version:** 0.15.0

---

## 1. Repo Map

### Top-Level Directory Tree

```
├── .github/                          GitHub Actions workflows and CI configuration
├── .gitignore                        Git ignore rules
├── .prettierignore                   Prettier formatting ignore rules
├── .prettierrc                       Prettier configuration
├── components.json                   shadcn/ui component registry config
├── eslint.config.js                  ESLint flat config (v9)
├── index.html                        Vite HTML entry point
├── package.json                      Root package: React/Vite frontend + Core lib
├── package-lock.json
├── postcss.config.cjs                PostCSS config for Tailwind
├── tailwind.config.js                Tailwind CSS theme configuration
├── tsconfig.json                     TypeScript config (paths: @/* -> src/, @core/* -> core/)
├── tsconfig.node.json                TS config for Vite/Node tooling
├── vite.config.ts                    Vite bundler config (port 4028, path aliases)
├── vitest.config.ts                  Vitest config (jsdom env, coverage)
├── README.md                         Project overview

├── agent/                            Go-based sub-agent orchestrator & tool executor
│   ├── cmd/agent/main.go             Entry point: parses env, wires dependencies, starts HTTP server
│   ├── cmd/agent/hub.go              AgentHub: dependency injection container
│   ├── internal/agent/               Orchestrator, sub-agent runner, agent type definitions
│   ├── internal/infra/               Express HTTP client, Tauri/CLI detection
│   ├── internal/model/               OpenAI-compatible LLM client (streaming + non-streaming)
│   ├── internal/server/              HTTP API server (Gorilla Mux, 15+ endpoints)
│   ├── internal/task/                Thread-safe task queue with lifecycle management
│   ├── internal/tool/                Tool registry + 12 tool implementations
│   ├── internal/worker/              Goroutine worker pool (4 workers)
│   ├── pkg/api/types.go              Shared API types for agent communication
│   ├── pkg/mcp/client.go             MCP JSON-RPC/stdio client
│   ├── prompts/                      EMPTY directory
│   ├── Makefile                      Build targets (cross-platform)
│   ├── go.mod / go.sum               Go module (uuid, gorilla/mux, cors)
│   └── agent.exe / build/xz-agent.exe  Pre-built Windows binaries (10.6 MB each)

├── browser/                          Browser extension types
│   ├── core/                         Core types for tab management
│   └── ui/                           UI types for browser extension

├── core/                             TypeScript "brain" — prompts, models, tools, memory, workspace
│   ├── index.ts                      Barrel export (public API)
│   ├── types.ts                      Shared tool types (ToolDef, ToolResult, ToolCategory)
│   ├── ARCHITECTURE.md               3-paragraph architecture doc
│   ├── OPTIMIZATION.md               Wishlist of optimizations (never acted on)
│   ├── README.md                     Brief readme
│   ├── agents/                       3 agent definitions (debug, strategy-auditor, teamwork)
│   ├── config/models.ts              Model definitions, providers, rotation logic (35+ models)
│   ├── eval/                         EMPTY — contains only .gitkeep
│   ├── memory/                       Context contraction + project context injection
│   ├── mode/                         Mode wrappers (1:1 aliases to agents, no unique logic)
│   ├── models/aiService.ts           Main LLM chat service (325 lines) — fallback chains, streaming
│   ├── prompt/                       System prompt (markdown + TS), toolcall guide (9 KB)
│   ├── tasks/                        EMPTY — contains only .gitkeep
│   ├── tools/                        26 tool definitions + ToolRegistry class
│   ├── utils/                        DatabaseService, WebSearchService, goProxy (HTTP to Go agent)
│   └── workspace/FileSystemService.ts  Triple-backend FS: Tauri | Server DB | Virtual (localStorage)

├── dist/                             Vite build output (compiled frontend)

├── docs/                             14 planning documents — never converted to code
│   ├── tool-system-architecture.md   Most substantive: two-layer architecture plan
│   └── (13 other .md files)          Feature ideation, plans, research notes

├── node_modules/                     Root frontend dependencies

├── public/                           Static assets (images)

├── server/                           Express.js backend (Node.js, port 3001)
│   ├── src/index.ts                  Express server: 20+ POST endpoints, SQLite via better-sqlite3
│   ├── src/db.ts                     SQLite setup, migration, query helper with LRU statement cache
│   ├── src/searchService.ts          Web search abstraction: Tavily, Firecrawl, Google CSE, Exa
│   ├── data/raw-code.db              SQLite database (7.6 MB)
│   ├── migrations/001_init.sql       Stale migration (uses PostgreSQL syntax, never applied)
│   ├── package.json                  Server deps (express, better-sqlite3, cors, uuid)
│   ├── .env / .env.example           Config (PORT, DATA_DIR, API_KEY)
│   └── tsconfig.json

├── src/                              React frontend (TypeScript, 102 source files)
│   ├── main.tsx                      React DOM entry
│   ├── app/App.tsx                   Root component with HashRouter
│   ├── components/                   UI components (chat, sidebar, settings, terminal, etc.)
│   ├── contexts/                     React contexts (Theme, Terminal, SessionTitle, Zoom, Toast)
│   ├── hooks/                        Custom hooks (useTypewriter, useArtifacts, useZoom, etc.)
│   ├── ide/                          Virtual filesystem, CodeMirror editor, command palette
│   ├── lib/                          Utilities: chatUtils, artifactParser, tauri detection
│   ├── pages/                        Page components (Chat, Chats, Schedule, Wiki, Plugins, etc.)
│   ├── services/                     Frontend service layer: ChatSessionManager, Wiki, Terminal, etc.
│   ├── styles/                       CSS files (index.css with Tailwind directives)
│   └── types/                        TypeScript type definitions (chat, artifact, schedule, wiki)

├── src-tauri/                        Tauri desktop shell (Rust)
│   ├── src/                          Rust source: terminal PTY, Tauri commands
│   ├── Cargo.toml / Cargo.lock       Rust dependencies
│   ├── tauri.conf.json               Tauri window/config
│   ├── capabilities/                 Tauri v2 capability permissions
│   ├── icons/                        App icons (Android + iOS)
│   └── build.rs                      Tauri build script

├── tests/                            5 test files
│   ├── aiRouting.test.ts             **BROKEN** — imports from non-existent paths
│   ├── chatUtils.test.ts             Tests for chat utility functions
│   ├── systemInfo.test.ts            Tests for system info
│   ├── tauri.test.ts                 Tests for Tauri detection
│   └── verify_tools.test.ts          Tool verification tests

└── types/                            Global type declarations
    └── tauri-globals.d.ts            Tauri global type augmentation
```

---

## 2. Harness Architecture Review

### 2.1 System Prompt Construction / Prompt Assembly

**Current:** The system prompt is assembled in `core/models/aiService.ts:183-185` by concatenating `SYSTEM_PROMPT` (imported from `core/prompt/systemPrompt.ts`, which inlines `system.md?raw` + `TOOLCALL_GUIDE`) with an optional mode-specific prompt. Project context is injected via `getSmartSystemPrompt()` in `core/memory/contextController.ts`, which appends a full file tree dump and file contents.

**Assessment: Naive.** The prompt is always the same regardless of the task — no dynamic pruning, no task-specific tool subset selection, no few-shot examples injected based on intent. Every turn sends the full 9 KB `TOOLCALL_GUIDE` plus the full system prompt. Compare to Claude Code/OpenCode, which trim tool descriptions based on the query and maintain separate short/long system prompts.

### 2.2 Tool/Function Definitions and Tool-Calling Loop

**Current:** Tools are defined in `core/tools/` as `ToolDef` objects with Zod schemas. They're registered into the Vercel AI SDK `streamText()` call at `core/models/aiService.ts:244-264` by reducing over the `allTools` array. The loop is the Vercel AI SDK's built-in `streamText()` with `maxSteps: 20` and `maxRetries: 2`.

**Assessment: Good (on the surface).** The Vercel AI SDK handles the tool loop, parsing, and streaming. However:
- The tool-wrapping code at lines 246-264 is fragile — it detects `inputSchema` presence but has a confusing `isAlreadyWrapped` check (line 253) that guards against double-wrapping inconsistently
- Tool descriptions are only modified dynamically for `web_search` (line 249-250) with an enormously long hardcoded string; every other tool gets its static description
- The `allTools.reduce()` pattern loses tool names if they're missing both `name` and `toolName` properties (silent failure)

### 2.3 Context Window Management

**Current:** Two mechanisms:
1. `core/memory/contextContractor.ts` — When the model changes between fallback attempts, it summarizes older messages and keeps last 4. Falls back to last-10 truncation on error.
2. `core/memory/contextController.ts` — Injects project file tree into system prompt.

**Assessment: Missing.** There is no:
- Token counting or budget-aware truncation
- Chunking of long file contents
- Compaction of tool results (full tool outputs stay in context verbatim)
- Long-term memory or RAG
- Sliding window based on actual token counts (just a fixed "keep last N" number)

Compare to OpenCode and Claude Code, which compact previous tool results into summaries, maintain token budgets, and page/selectively include file contents.

### 2.4 File Read/Edit Strategy

**Current:** Three mechanisms:
1. **Go agent** (`agent/internal/tool/read_file.go`, `edit_file.go`, `write_file.go`) — read with offset/limit, edit via string replacement (first occurrence only), write creates parent dirs
2. **TypeScript tools** (`core/tools/code/`) — all delegate to Go via `callGoTool()` in `core/utils/goProxy.ts`, which is an HTTP POST to `localhost:3002`
3. **FileSystemService** (`core/workspace/FileSystemService.ts`) — triple-backend (Tauri FS, Server DB, localStorage virtual FS), used for project context gathering, NOT for tool execution

**Assessment: Good (for Go tools), Fragmented (for overall architecture).** The Go edit tool (`edit_file.go`) does search-and-replace which is the industry standard (used by OpenCode, Claude Code). But the two-layer architecture means:
- The Go agent has its own complete set of file tools
- The TypeScript core has another set that proxies to Go
- FileSystemService has a third set for project context

This triple duplication is confusing and means file operations go frontend -> TypeScript tool -> HTTP -> Go -> filesystem, adding ~1-5ms per hop.

### 2.5 Command/Code Execution Sandboxing

**Current:** 
- `agent/internal/tool/tool.go` — `runCmd()` executes via `exec.CommandContext` with no sandboxing (just `context.Background()` for cancellation)
- `agent/internal/tool/executor.go` — `SandboxPath()` prevents path traversal by resolving against project root
- `core/tools/system/runCommand.ts` — proxies to Go via `callGoTool()` with timeout clamping
- The system prompt instructs "NEVER run destructive commands without explicit user approval" (purely a prompt-level guard)

**Assessment: Naive.** There is no:
- Container/Docker sandbox
- Firecracker or gVisor isolation
- Network restrictions
- File system access controls beyond path traversal prevention
- Permission model per tool (all-or-nothing)

Compare to Claude Code which offers `--allow-commands` flag filtering, or OpenCode which has a permission system for sensitive operations. Everything runs with the user's full privileges.

### 6. Retry/Self-Correction Loop

**Current:**
- Model-level: `maxRetries: 2` in `streamText()` (line 268)
- Fallback chain: `buildFallbackChain()` in `aiService.ts:115-147` — tries up to 6 different models on failure
- No post-execution verification of tool results
- No test-running after code changes
- No re-planning when a plan fails

**Assessment: Missing.** The system has model-level fallback but zero task-level self-correction. When a tool call produces wrong output, the model must notice and fix it on the next step — there's no automated verification, no test runner integration, no "check my work" phase. Compare to OpenCode which runs linters/tests after edits and reverts on failure.

### 7. Multi-Step Planning vs Single-Shot Prompting

**Current:** The system prompt encourages planning ("restate the goal, decompose into sub-tasks"), but the actual architecture has no explicit planning phase. The Go orchestrator supports a `decompose` task type (`orchestrator.go`) that uses an LLM to break tasks into subtasks, but this is optional and not integrated into the default chat flow.

**Assessment: Naive.** Mature tools (Claude Code, Codex CLI) have an explicit upfront planning step that generates a structured plan, gets user approval, then executes step by step. Here, the model must plan and execute in a single stream. The `decompose` task type is a start but lives only in the Go agent and isn't wired into the main chat loop.

### 8. Model/Provider Abstraction

**Current:** `core/models/aiService.ts` supports 6 providers (Google, Groq, Mistral, OpenRouter, OpenCodeZen, Cerebras) via the Vercel AI SDK provider packages. The `getLanguageModel()` function maps provider to provider instance. API keys are fetched from DB/localStorage. A fallback chain tries models in priority order.

**Assessment: Good.** The provider abstraction is clean — each provider is a separate Vercel AI SDK integration, config is via `API_KEYS` map (`core/config/models.ts:69-76`). Fallback chains, thinking support, and rotation mode are implemented. This is on par with mature tools. Missing: latency-aware routing, cost-aware prioritization, and per-task model selection.

### 9. State/Session Persistence

**Current:** Two persistence layers:
1. Express server SQLite — `chat_sessions`, `messages`, `app_config`, `projects`, `project_files` tables
2. Browser localStorage — API keys, model selections, model-used tracking, IDE files

**Assessment: Adequate.** Session persistence works but has issues:
- Dual storage (server + localStorage) creates sync problems — API keys are in both places
- The `initUsedModelsCache()` function in `core/config/models.ts` fetches from server but falls back silently
- `cleanupUsedModelsStorage()` deletes ALL `used-models-*` keys from localStorage on init — this destroys rotation tracking across page reloads
- No offline queue or conflict resolution

---

## 3. Structural Problems

### 3.1 Duplicate Tool Systems (3x Duplication)

The same tool concepts are implemented in three separate places with different interfaces:

| Tool | Go Agent | Core/Tools (TS) | FileSystemService |
|------|----------|-----------------|-------------------|
| read_file | `agent/internal/tool/read_file.go` | `core/tools/code/readFile.ts` → HTTP → Go | `FileSystemService.getFileContent()` |
| write_file | `agent/internal/tool/write_file.go` | `core/tools/code/writeFile.ts` → HTTP → Go | `FileSystemService.saveFile()` |
| edit_file | `agent/internal/tool/edit_file.go` | `core/tools/code/editFile.ts` → HTTP → Go | (not in FS service) |
| list_directory | `agent/internal/tool/list_directory.go` | `core/tools/code/listDirectory.ts` → HTTP → Go | `FileSystemService.getTree()` |
| grep_files | `agent/internal/tool/grep_files.go` | `core/tools/code/grepFiles.ts` → HTTP → Go | (not in FS service) |
| glob_files | `agent/internal/tool/glob_files.go` | `core/tools/code/globFiles.ts` → HTTP → Go | (not in FS service) |

The TypeScript tools are thin HTTP stubs that add no value — they add latency and a failure point. The Go agent already has all these tools. The TypeScript tools should either be removed (let the Go agent handle them directly) or the Go agent tools should be the source of truth.

### 3.2 `core/mode/` is a Pointless Abstraction

All files in `core/mode/` are 1:1 wrappers around `core/agents/`:
- `core/mode/debug/index.ts` = `getAgentById('debug')!`
- `core/mode/grill-me/index.ts` = `getAgentById('strategy-auditor')!`
- `core/mode/plan/index.ts` = `getAgentById('strategy-auditor')!`
- `core/mode/teamwork/index.ts` = `getAgentById('teamwork')!`

`core/mode/index.ts` literally exports `MODES = AGENTS`. The `Mode` and `ModeSkill` types in `core/mode/types.ts` have extra fields (`skills`, `type` pattern) that are never used — `ModeSkill` has an `execute` function that no mode implements.

**Verdict:** The entire `core/mode/` directory should be deleted and its consumers refactored to use `core/agents/` directly.

### 3.3 Empty Directory Stubs

```
core/eval/.gitkeep          — "for eval framework" — never started
core/tasks/.gitkeep         — "for task planning" — never started
agent/prompts/              — empty, while agent prompts are in agent/internal/agent/prompts/
```

These serve no purpose and mislead developers about what exists.

### 3.4 Tests Importing Non-Existent Modules

`tests/aiRouting.test.ts:2-3` imports from `'../src/services/aiService'` and `'../src/config/models'`. These paths do not exist — the actual modules are at `core/models/aiService.ts` and `core/config/models.ts`. **These tests will fail immediately** with a module-not-found error. Furthermore, the test mocks are against the old file paths, so even if the import path were fixed, the mocks would need rewriting.

`tests/verify_tools.test.ts` — purpose unclear, likely stale.

### 3.5 Missing Abstraction Layer Between Frontend and Agent

The frontend (`src/`) imports directly from `@core/*` which is a core lib living in the same repo. The Go agent (`agent/`) is accessed via `callGoTool()` in `core/utils/goProxy.ts` (an HTTP call to `localhost:3002`). There's no service mesh, no API gateway, no unified discovery layer. If the Go agent is down, tools silently fail or throw opaque HTTP errors.

### 3.6 Config/Secrets Handling Issues

- Environment variables are scattered: `.env` in `server/`, `VITE_*` in the frontend, `AGENT_*` in Go agent env. No single source of truth.
- API keys are dual-stored in localStorage AND the Express DB. `refreshProviders()` in `core/models/aiService.ts:32-34` clears the cached provider, but the keys are re-fetched from both sources with localStorage taking fallback priority. This means stale localStorage keys can override server-stored keys.
- Go agent main.go (`agent/cmd/agent/main.go`) queries the Express DB for API keys by probing `opencodezen-api-key`, `openrouter-api-key`, `api-key`, `groq-api-key` — these are hardcoded strings, not configurable.
- The `.env` file for the server has `API_KEY` for optional auth, but the frontend doesn't use it (no `X-Api-Key` header is set from the browser).

### 3.7 Circular Dependency Risk

`core/utils/DatabaseService.ts` is imported by:
- `core/config/models.ts` (for `getConfig`/`setConfig`)
- `core/models/aiService.ts` (for API key fetching)
- `core/workspace/FileSystemService.ts` (for file persistence)
- `src/` pages and components

`DatabaseService` in turn calls the Express server. There's no clean separation between "config read" and "database query" — the same service handles both API key lookup and message storage.

### 3.8 `core/prompt/system.md` Duplication

`core/prompt/system.md` (3,962 bytes) is the raw system prompt as markdown. `core/prompt/systemPrompt.ts` imports it via `?raw` Vite query, then appends `TOOLCALL_GUIDE` and returns `SYSTEM_PROMPT`. The same content is effectively in two formats. Either the `.md` should be the single source of truth (and `systemPrompt.ts` just loads it), or the TS file should own it entirely. Currently the `.md` can drift from what `systemPrompt.ts` constructs.

### 3.9 `vitest.config.ts` Has Wrong Coverage Path

```
coverage: {
  include: ['src/server/**/*.ts'],  // Points to non-existent server in src/
}
```

There is no `src/server/` directory. The Express server is at `server/src/`. Coverage is configured to watch nothing useful.

---

## 4. Dead Code & Bloat

### 4.1 Unused Files

| File | Reason |
|------|--------|
| `agent/prompts/` (empty dir) | No files inside |
| `core/eval/.gitkeep` | Empty eval directory, never used |
| `core/tasks/.gitkeep` | Empty tasks directory, never used |
| `tests/aiRouting.test.ts` | Imports from non-existent paths, cannot run |
| `tests/verify_tools.test.ts` | Purpose unclear, non-standard |
| `server/migrations/001_init.sql` | Uses PostgreSQL syntax (UUID, JSONB) but runtime uses SQLite — never applied; `db.ts` runs its own migration |
| `docs/` (all 14 files) | Planning documents, no code references to them |

### 4.2 Unused Functions/Exports

- `core/types.ts`: `ToolDef`, `ToolResult`, `ToolCategory` are exported but `ToolResult` is never imported anywhere outside core — tool results are handled inline.
- `core/mode/types.ts`: `ModeSkill` and `Mode` types have unused fields (`skills: ModeSkill[]` with `execute` function that no implementation provides).
- `core/tools/registry.ts`: `ToolRegistry` class is defined but never instantiated or used anywhere. The tools are loaded directly via `allTools` array in `aiService.ts`.
- `core/workspace/FileSystemService.ts`: `getCompressedTree()` is defined but never called from any consumer.
- `core/workspace/FileSystemService.ts`: `uploadProjectFiles()` is defined but never called.
- `agent/pkg/mcp/client.go`: MCP client is built but there's no evidence it's integrated into any workflow (no tool calls to it in the orchestrator, server, or executor).

### 4.3 Unused or Overlapping Dependencies

In `package.json`:
- `@codemirror/lang-angular`, `@codemirror/lang-less`, `@codemirror/lang-sass`, `@codemirror/lang-vue`, `@codemirror/lang-yaml`, `@codemirror/lang-xml`, `@codemirror/lang-php`, `@codemirror/lang-java`, `@codemirror/lang-cpp`, `@codemirror/lang-rust` — 10 CodeMirror language extensions. Are all 10 actively needed? Likely some are unused.
- `@hugeicons/core-free-icons` + `@hugeicons/react` — 3.8 MB icon library. Check if icons are actually used.
- `mermaid` (11.15.0) — 1.5 MB diagram library. Used only for artifact rendering in chat.
- `fallow` (devDependency, ^2.89.0) — I cannot find what this package does. It's not a well-known testing/lint tool.
- `@testing-library/jest-dom` + `@testing-library/react` (devDependencies) — only 0-1 tests actually use React testing library.

### 4.4 Pre-compiled Binaries in Repo

```
agent/agent.exe                  (10.6 MB)
agent/build/xz-agent.exe         (10.6 MB)
```

Two Windows executables are committed to the repo. Binaries should not be in version control. The `build/` directory is the build output target of the Makefile — the binary there is expected. But the root `agent.exe` appears to be a duplicate, possibly from an accidental copy.

### 4.5 Leftover Duplicate Tool Implementations

The TypeScript `core/tools/code/` tools (readFile, writeFile, editFile, listDirectory, findFiles, grepFiles, globFiles, codeSearch, fileStats, countLines) and `core/tools/git/` tools (gitStatus, gitDiff, gitLog, gitBranches, gitShow) are direct proxies to the Go agent. Every one of these tools is already fully implemented in Go. The TS versions add zero functionality — just HTTP serialization overhead.

### 4.6 `core/prompt/system.md` vs `systemPrompt.ts` Content Drift Risk

The raw markdown (`system.md`) imports into `systemPrompt.ts` via `?raw`, but then `systemPrompt.ts` may add additional content before the toolcall guide. The `.md` file is not the actual source of truth — `systemPrompt.ts` is.

---

## 5. What to Scrap Entirely

### 5.1 `core/mode/` — Entire Directory

**Scrap.** This is a wrapper abstraction with zero value. All 5 files (`index.ts`, `types.ts`, `debug/index.ts`, `grill-me/index.ts`, `plan/index.ts`, `teamwork/index.ts`) just re-export agent configs from `core/agents/`. The `ModeSkill` type is dead code. Update the 3 consumers (`ChatPage.tsx`, `ChatInput.tsx`, `aiService.ts`) to import from `core/agents/` directly.

### 5.2 `core/tools/registry.ts` — The `ToolRegistry` Class

**Scrap.** The `ToolRegistry` class is instantiated zero times across the entire codebase. Tools are loaded via the static `allTools` array. If a registry is needed later, rebuild it with actual usage patterns. The current one is speculative.

### 5.3 `core/eval/` and `core/tasks/` Directories

**Scrap.** They contain only `.gitkeep` files. The README and ARCHITECTURE.md reference them as aspirational, but they have never been started. Delete the directories and update docs to remove references.

### 5.4 `agent/prompts/` Empty Directory

**Scrap.** No files, no purpose. The Go agent prompts are in `agent/internal/agent/prompts/`.

### 5.5 `server/migrations/001_init.sql`

**Scrap.** Uses PostgreSQL syntax (`UUID`, `JSONB`, `BOOLEAN`) against a SQLite database. The actual migration runs from `db.ts:migrate()` at runtime. This file has never been used and will never be used.

### 5.6 `tests/aiRouting.test.ts` (as-is)

**Scrap and rewrite.** The test imports from non-existent paths. The actual `buildFallbackChain` function has moved to `core/models/aiService.ts`. This file cannot even be loaded by the test runner. Rewrite it entirely targeting the correct module.

---

## 6. What to Improve (Not Scrap)

### 6.1 Unify the Tool Layer

**Problem:** Tool execution goes: TypeScript tool → HTTP → Go agent, or TypeScript tool → Vercel AI SDK → execute() → HTTP → Go agent. This is a chain of unnecessary hops.

**Fix:** For the main chat loop in `aiService.ts`, the model calls tools via `streamText()`, the `execute()` handler fires, and currently calls `callGoTool()`. For tools that Go already handles (file ops, git, commands), this is fine — but the TS "tool definition" should be auto-generated from the Go tool registry, not hand-written. Create a single source of truth (Go's registry) and generate the TS tool stubs dynamically or at build time.

### 6.2 Fix AI Routing Tests

**Problem:** `tests/aiRouting.test.ts:2-3` imports from non-existent paths.

**Fix:** Update imports to `@core/models/aiService` and `@core/config/models`. The vitest config needs `@core` alias added (currently only has `@/`). Fix the mock to match the actual module structure.

### 6.3 Add a Real Sandbox

**Problem:** `agent/internal/tool/executor.go:77-84` — `SandboxPath()` only prevents path traversal. `runCmd()` in `tool.go:35-50` executes with the user's full privileges.

**Fix:** Implement at minimum a command allowlist/blocklist (like OpenCode's permission system). Better: container-based execution with configurable resource limits. The system prompt warning is not sufficient.

### 6.4 Context Window Management

**Problem:** No token counting, no budget-aware truncation, no compaction of tool results.

**Fix:** In `aiService.ts` before calling `streamText()`, count tokens of the message list (or estimate with a fast tokenizer like `gpt-tokenizer`). When approaching the model's limit, compact old tool results (summarize what each tool returned rather than including the full output). This is the single largest quality improvement available.

### 6.5 Replace Hand-Written Tool Stubs with Generated Bridge

**Problem:** 15+ TypeScript tool files in `core/tools/code/` and `core/tools/git/` are manually written stubs that all follow the same pattern: Zod schema + `callGoTool()`. This is fragile and requires manual sync.

**Fix:** Either (a) generate TS tools from the Go tool registry at build time, or (b) create a single `callGoTool` meta-tool that the model can use for any Go-side tool, with dynamic schema discovery. Option (b) is simpler and avoids code generation.

### 6.6 Consolidate Config/Secrets

**Problem:** API keys are read from localStorage + Express DB + environment variables, all with different precedence rules in different places.

**Fix:** Single source of truth: Express DB. localStorage is a cache only (write-through). Environment variables are for server config, not user API keys. Remove the `AGENT_API_KEY` from Go agent and have it authenticate via a shared token or JWT.

### 6.7 Implement Real Task-Level Self-Correction

**Problem:** When code is edited, there's no automated verification — no lint, no type-check, no test run, no diff review.

**Fix:** After `edit_file`/`write_file` tool calls, automatically run the project's lint command and type-check command. If they fail, revert the change and report the error to the model. This requires the model to know which commands to run (can be configured per project or detected from package.json).

### 6.8 Clean up the `allTools.reduce()` in `aiService.ts`

**Problem:** Lines 246-264 of `aiService.ts` have a fragile reduce loop that wraps tools with `zodSchema()` and checks `isAlreadyWrapped`. The code is hard to follow and silently drops tools without `name` or `toolName`.

**Fix:** Define tools as a Record (name → ToolDef) instead of an array. Use a consistent shape. Remove the heuristic `isAlreadyWrapped` check. If a tool is already an AI SDK `tool()` object, don't try to wrap it again — distinguish at the type level instead.

---

## 7. What to Optimize

### 7.1 Tool Tool Tool Serialization Overhead

Every tool call from the frontend goes TypeScript → HTTP POST → Go agent. For file operations, that's an unnecessary HTTP round-trip per call. During a typical editing session with 10+ tool calls, this adds 50-500ms of pure overhead (HTTP processing on both sides). 

**Fix:** Run file/git operations directly from the TypeScript tool `execute()` when running in Tauri (which has native FS access via plugin). Only fall back to the Go agent when Tauri isn't available. The Go agent should be for sub-agent orchestration and parallel tasks, not basic file reads.

### 7.2 No Caching for File Reads

The `FileSystemService` has a tree cache with 2-second TTL (`core/workspace/FileSystemService.ts:25-26`), but there's no content cache for file reads. Every `read_file` tool call hits the Go agent, which reads from disk. In a multi-step debugging session where the model reads the same file 3-4 times, this is wasteful.

**Fix:** Add a content cache (in-memory Map with path → {content, timestamp}) in the Go agent's `read_file.go` with a TTL of ~5 seconds. Clear it on `write_file`/`edit_file` calls.

### 7.3 Excessive System Prompt Size

The system prompt sent every turn is approximately:
- `system.md`: ~3,900 bytes
- `TOOLCALL_GUIDE`: ~9,000 bytes
- Mode prompt (if set): ~1,500 bytes
- Project context: anywhere from 0 to 60,000 bytes
- Tool descriptions (26 tools): ~5,000 bytes

That's roughly **20 KB+** every single turn even before any user messages. For a model with a 200K context window, this is ~10% consumed by instructions before any actual work begins.

**Fix:**
- Make `TOOLCALL_GUIDE` dynamic — only include the sections relevant to the tools the model is actually calling this turn
- Project context should be loaded only when the model explicitly asks for it (via a `get_project_context` tool), not prepended to every system prompt
- Tool descriptions should be trimmed — don't show git tools if the model is doing web research

### 7.4 Redundant `getConfiguredProviders()` Call

In `core/models/aiService.ts:103-113`, `getConfiguredProviders()` iterates over all 6 providers and calls `DatabaseService.getConfig()` for each. This is called inside `buildFallbackChain()` which is called during every `chatCompletion()`. Each call is an HTTP request to the Express server. That's 6 HTTP requests per chat turn just to check which providers have keys.

**Fix:** Cache the configured providers result alongside the cached API keys in `getProviders()`. Invalidate only on `refreshProviders()`.

### 7.5 Sequential API Key Fetching

In `core/models/aiService.ts:37-51`, all 6 API keys are fetched via `Promise.all`, which is good. But `getConfiguredProviders()` at line 105 does the same calls again sequentially (not in parallel). Merge the two code paths.

### 7.6 Unnecessary `getUsedModels` Array Construction

`getUsedModels()` in `core/config/models.ts:98-110` parses JSON from localStorage every time. `buildFallbackChain()` calls it once. `getNextExploringModel()` calls it multiple times. The `usedModelsCache` Map mitigates this but is only checked after the first localStorage read.

**Fix:** Keep the cache, but also guard against stale entries — if localStorage was modified by another tab, the cache is wrong.

### 7.7 Go Agent Health Check on Every `/api/tools` Call

The `server.go` health endpoint and tool listing have no caching. Every request to `/api/tools` builds the list from scratch by iterating the registry. For a rarely-changing list of ~12 tools, cache it.

### 7.8 Large Pre-compiled Binaries in Git

`agent/agent.exe` (10.6 MB) and `agent/build/xz-agent.exe` (10.6 MB) are in the repo. Every clone and fetch downloads 21 MB of binaries. These should be in `.gitignore` and built from source.

---

## 8. Safe-to-Delete List

| File | Confidence | Reason |
|------|-----------|--------|
| `core/eval/.gitkeep` | **High** | Empty directory placeholder |
| `core/tasks/.gitkeep` | **High** | Empty directory placeholder |
| `core/mode/types.ts` | **High** | `ModeSkill.execute` is never implemented; `Mode` is entirely replaced by `Agent` |
| `core/mode/index.ts` | **High** | `MODES === AGENTS` — just re-export |
| `core/mode/debug/index.ts` | **High** | One-liner `getAgentById('debug')!` |
| `core/mode/grill-me/index.ts` | **High** | One-liner `getAgentById('strategy-auditor')!` |
| `core/mode/plan/index.ts` | **High** | One-liner `getAgentById('strategy-auditor')!` |
| `core/mode/teamwork/index.ts` | **High** | One-liner `getAgentById('teamwork')!` |
| `core/tools/registry.ts` | **High** | Never instantiated; tools use `allTools` array directly |
| `agent/prompts/` (directory) | **High** | Empty |
| `server/migrations/001_init.sql` | **High** | PostgreSQL syntax, never applied; `db.ts` has its own migration |
| `agent/agent.exe` | **High** | Duplicate binary; `agent/build/xz-agent.exe` is the build output |
| `tests/aiRouting.test.ts` | **Medium** | Broken imports; should be rewritten, but test logic itself is useful |
| `agent/test_diag.txt` | **High** | Contains "diagnostic test file" — leftover test artifact |
| `docs/toolcall.md` | **Medium** | Planning docs; could be archived |
| `docs/artifact-research.md` | **Medium** | Planning docs |
| `docs/websearch-tool-plan.md` | **Medium** | Planning docs |
| `docs/plugins-tab-ideas.md` | **Medium** | Planning docs |
| `docs/schedule-tab-ideas.md` | **Medium** | Planning docs |
| `docs/wiki-tab-ideas.md` | **Medium** | Planning docs |
| `docs/write-tool-plan.md` | **Medium** | Planning docs |
| `docs/cli-detection-plan.md` | **Medium** | Planning docs |
| `docs/agent-sandboxing.md` | **Medium** | Planning docs |
| `docs/agentic-tools-plan.md` | **Medium** | Planning docs |
| `docs/go-proxy-pattern.md` | **Medium** | Planning docs |
| `docs/thinking-timeline-ui-plan.md` | **Medium** | Planning docs |
| `docs/api-endpoint-findings.md` | **Low** | Contains actual research findings, potentially useful |
| `core/prompt/system.md` | **Low** | Could be source of truth if `systemPrompt.ts` imports it; but currently both exist |

---

## 9. Prioritized Action Plan

### P1: Fix Broken Tests and Import Paths
**Effort:** Low | **Impact:** High

`tests/aiRouting.test.ts` imports from deleted paths (`../src/services/aiService`, `../src/config/models`). Fix imports to point to `@core/models/aiService` and `@core/config/models`. Add `@core` alias to `vitest.config.ts`. The test mocks need rewriting to match the new module structure. Without this, the test suite is broken and provides no safety net.

### P2: Delete `core/mode/` — Pointless Abstraction
**Effort:** Low | **Impact:** Medium

5 files that are 1:1 wrappers around `core/agents/`. Update `core/index.ts` to export `getModeSystemPrompt` → use `getAgentSystemPrompt` or similar. Update 3 consumers in `src/` to reference `core/agents/` directly. Saves future developers from confusion about which abstraction to use.

### P3: Implement Token-Aware Context Window Management
**Effort:** Medium | **Impact:** Very High

The single biggest quality improvement available. Before each `chatCompletion()` call, estimate token count of the message array. When approaching the model's limit (e.g., 80% of 200K), compact tool results by summarizing their output. Implement a sliding window that keeps the system prompt + last N messages within budget. Add chunking for long file reads (show first 200 lines, with a `read_more` tool to continue).

### P4: Dynamic System Prompt (Trim Tool Descriptions Per-Task)
**Effort:** Medium | **Impact:** High

The `TOOLCALL_GUIDE` is 9 KB of fixed text sent every turn. Analyze the current message to infer intent (code editing, web research, git operations) and include only relevant guidance sections. Trim tool descriptions to essentials — the `web_search` description is 400+ words (aiService.ts:250). The model doesn't need to re-read the same guide every turn.

### P5: Remove Duplicate TS Tool Stubs, Use Go Registry Directly
**Effort:** Medium | **Impact:** Medium

15 TypeScript tool files in `core/tools/code/` and `core/tools/git/` are thin HTTP stubs. Replace them with a single `go_tool` meta-tool that forwards tool name + params to the Go agent. Or better: have the Go agent expose its tool registry via `/api/tools` endpoint (already exists) and auto-discover tool schemas at startup, removing the need for manual TS definitions.

### P6: Delete Pre-compiled Go Binaries from Repo
**Effort:** Low | **Impact:** Medium

`agent/agent.exe` and `agent/build/xz-agent.exe` total 21 MB. Add `*.exe` patterns to `.gitignore` in the `agent/` directory. Remove from git with `git rm --cached`. Build from source via `make build` instead.

### P7: Implement Tool Result Caching
**Effort:** Low | **Impact:** Medium

Add an in-memory content cache to the Go agent's `read_file.go` (path → content, TTL 5s, invalidated on write/edit). This avoids redundant disk reads when the model re-reads files it just edited. Similarly cache directory listings and git status outputs during a single task.

### P8: Add Post-Edit Verification (Lint/TypeCheck)
**Effort:** Medium | **Impact:** High

After every `edit_file` or `write_file` tool call, automatically run `npm run type-check` and `npm run lint` (or detected equivalents). If they fail, revert the change and report to the model. This is how mature coding agents prevent introducing type errors and lint issues. The commands should be auto-detected from `package.json` scripts.

### P9: Merge `vitest.config.ts` Coverage with Correct Paths
**Effort:** Low | **Impact:** Low

Coverage config includes `src/server/**/*.ts` which doesn't exist. Fix to point to `server/src/` and `core/`. Currently coverage reports are empty/useless.

### P10: Unify API Key Storage (One Source of Truth)
**Effort:** Medium | **Impact:** Medium

API keys are stored in 3 places: Express DB, localStorage, and environment variables. Choose one canonical source (Express DB is best for persistence across devices). localStorage is a local cache only — write-through on save, invalidate on conflict. Remove the `AGENT_API_KEY` env var approach from the Go agent and have it authenticate via a shared service token. This eliminates a class of bugs where keys get out of sync.
