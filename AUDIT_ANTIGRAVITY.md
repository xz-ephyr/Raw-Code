# Code Quality & Redundancy Audit: xz (Raw-Code) Repository
**Date:** July 7, 2026  
**Auditor:** Antigravity Code Quality Team  
**Scope:** Frontend (React/Vite/Tauri), Backend (Express.js/SQLite), Core Agent Logic (TypeScript), Go CLI Agent Sidecar (Go 1.24)

---

## 1. Codebase Health Snapshot

### General Statistics
*   **Total Git-Tracked Files:** 354
*   **Total Lines of Code (LOC):** 49,028 (tracked files)
*   **Primary Languages:** TypeScript (Frontend & Core), Go (CLI Agent sidecar), Rust (Tauri native shell), HTML, CSS, SQL.

### Biggest Source Files by LOC (Top 15)
1.  [src/components/chat/ThinkingTimeline.tsx](file:///C:/Users/zephy/Documents/Raw-Code/src/components/chat/ThinkingTimeline.tsx) — 604 LOC
2.  [src/pages/ChatPage.tsx](file:///C:/Users/zephy/Documents/Raw-Code/src/pages/ChatPage.tsx) — 557 LOC
3.  [agent/internal/server/server.go](file:///C:/Users/zephy/Documents/Raw-Code/agent/internal/server/server.go) — 420 LOC
4.  [server/src/searchService.ts](file:///C:/Users/zephy/Documents/Raw-Code/server/src/searchService.ts) — 414 LOC
5.  [agent/internal/agent/orchestrator.go](file:///C:/Users/zephy/Documents/Raw-Code/agent/internal/agent/orchestrator.go) — 412 LOC
6.  [src/components/chat/MarkdownMessage.tsx](file:///C:/Users/zephy/Documents/Raw-Code/src/components/chat/MarkdownMessage.tsx) — 390 LOC
7.  [agent/internal/agent/subagent.go](file:///C:/Users/zephy/Documents/Raw-Code/agent/internal/agent/subagent.go) — 373 LOC
8.  [core/workspace/FileSystemService.ts](file:///C:/Users/zephy/Documents/Raw-Code/core/workspace/FileSystemService.ts) — 347 LOC
9.  [src/components/wiki/WikiEditor.tsx](file:///C:/Users/zephy/Documents/Raw-Code/src/components/wiki/WikiEditor.tsx) — 316 LOC
10. [src/components/chat/ChatInput.tsx](file:///C:/Users/zephy/Documents/Raw-Code/src/components/chat/ChatInput.tsx) — 305 LOC
11. [src/components/sidebar/Sidebar.tsx](file:///C:/Users/zephy/Documents/Raw-Code/src/components/sidebar/Sidebar.tsx) — 300 LOC
12. [src/ide/FileSystem.ts](file:///C:/Users/zephy/Documents/Raw-Code/src/ide/FileSystem.ts) — 300 LOC
13. [core/models/aiService.ts](file:///C:/Users/zephy/Documents/Raw-Code/core/models/aiService.ts) — 290 LOC
14. [agent/internal/model/client.go](file:///C:/Users/zephy/Documents/Raw-Code/agent/internal/model/client.go) — 283 LOC
15. [server/src/index.ts](file:///C:/Users/zephy/Documents/Raw-Code/server/src/index.ts) — 280 LOC

### Test Coverage Presence
*   **TypeScript/React Unit Tests:** Yes, 5 test files in the `tests/` directory run via Vitest. However, they only cover basic utility functions (`chatUtils.ts`, `tauri.ts`, `systemInfo.ts`) and a mocked proxy client (`verify_tools.test.ts`). There are **no tests** covering React components, hooks, or backend server endpoints.
*   **Go Agent Unit Tests:** Yes, 4 test files are present (`orchestrator_test.go`, `subagent_test.go`, `manager_test.go`, `registry_test.go`).
*   **Build & Verification Status:** Several Go unit tests are **currently failing** due to logical mismatches in assertions (see Section 3). The principal TypeScript routing test (`tests/aiRouting.test.ts`) is completely **broken** and fails on load because it references non-existent import paths.
*   **Code Coverage Setup:** Stale. The Vitest configuration (`vitest.config.ts`) lists an incorrect coverage target (`src/server/**/*.ts`), which does not exist in the codebase. True code coverage is **0%** for all backend server and main frontend logic.

### First-Impression Grade: C
**Justification:** The project has a solid multi-tier architecture combining Tauri (desktop shell), React (user interface), Node/Express (local SQLite database persistence), and Go (asynchronous task worker/agent). However, it is plagued by **deep schema drift** (especially on file editing tools), massive **tooling redundancy**, **broken tests**, **stale configuration files**, and **naive context window management**. The system feels like two separate projects (a Go agent and a TypeScript core) glued together with HTTP stubs.

---

## 2. Redundancy & Duplication Report

### 2.1 Triple-Duplicated File Operations
The codebase defines file reading and writing operations in three distinct systems:
1.  **Go Sidecar Handlers:** Implemented in `agent/internal/tool/read_file.go` and `write_file.go` using OS-level operations.
2.  **TypeScript Proxies:** Implemented in `core/tools/code/readFile.ts` and `writeFile.ts` which act as wrappers making HTTP POST requests to the Go sidecar via `callGoTool()`.
3.  **Core FileSystemService:** Implemented in `core/workspace/FileSystemService.ts` as `getFileContent()` and `saveFile()`. This service maintains its own "triple-backend" logic: resolving paths natively in Tauri (`tauri-plugin-fs`), uploading to the Express database (`saveProjectFiles`), or falling back to a virtual `localStorage` FS.

This means reading a file during chat tool execution goes through Vercel AI SDK -> TS Tool Definition -> HTTP POST -> Go Sidecar Server -> File System, while project initialization uses the independent `FileSystemService`.

### 2.2 Duplicated Web Search Routing (TS -> Go -> Express)
The web search tool follows an incredibly convoluted pathway:
*   The model decides to run `web_search` in the React frontend.
*   It fires `webSearchTool` from `core/tools/web/webSearchTool.ts`.
*   The TS tool's `execute` calls `WebSearchService.search()` which makes an HTTP request to the Express server (`http://localhost:3001/websearch`).
*   **HOWEVER**, if the Go sub-agent runner invokes a search, it executes Go's `webSearchTool()` (`agent/internal/tool/web_search.go`), which calls `ExpressClient.WebSearch` (`agent/internal/infra/express.go`), which hits the Express server (`http://localhost:3001/websearch`) back.
*   Express then runs `webSearch()` (`server/src/searchService.ts`) to query Google/Tavily/Exa.
*   *Redundancy:* We have multiple HTTP hops and duplicated logic to bridge search calls between TS and Go, routing through Express twice.

### 2.3 Duplicated Prompts & Agent Definitions
There is duplicate modeling for agent personas:
*   **TypeScript Core:** `core/agents/` defines `debugAgent`, `strategyAuditorAgent`, and `teamworkAgent` with their metadata, prompts, and toolsets.
*   **Go Agent:** `agent/internal/agent/agents/` contains `debug.md`, `strategy-auditor.md`, and `teamwork.md` which replicate the instructions in markdown, alongside Go-level scopes.

---

## 3. Complexity & Fragility Report

### 3.1 edit_file Schema Drift (Fatal Tool Mismatch)
The file editing mechanism is **completely broken** due to a parameter mismatch between TypeScript and Go:
*   **TypeScript Definition:** `core/tools/code/editFile.ts` defines `diff` (Git merge conflict style `<<<<<<< SEARCH ... ======= ... >>>>>>> REPLACE`) as the input parameter.
*   **Go Implementation:** `agent/internal/tool/edit_file.go` expects `old_string` (exact search target) and `new_string` (replacement target) as parameters.
*   *Result:* When the main chat loop executes `edit_file`, it sends `{ path, diff }` via HTTP to Go. Go looks for `old_string`, finds it empty, and throws a validation error: `"old_string is required"`. The model is unable to edit files.

### 3.2 Buggy Go Unit Tests & Implementations
The Go test suite contains failures due to buggy code and incorrect assertions:
*   **`TestResolveVar/multiple_vars`:** The test expects `resolveVar("$a and $b", "a", 1)` to return `"$a and $b"`. However, the code correctly replaces `"$a"` with `"1"`, resulting in `"1 and $b"`. The assertion is logic-defying.
*   **`TestResolveVar/non-alpha_after_$`:** The test expects `resolveVar("test $1val", "1val", "x")` to remain `"test $1val"`. However, `isAlpha` treats digits as alpha, so the code correctly swaps `"$1val"` with `"x"`. The test is misaligned with the parser's logic.
*   **`TestStripMarkdownJSON/only_whitespace`:** The parser is fragile:
    ```go
    // agent/internal/agent/orchestrator.go
    func stripMarkdownJSON(s string) string {
        start := 0
        end := len(s)
        for start < len(s) && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
            start++
        }
        // ...
        if start < end {
            return s[start:end]
        }
        return s
    }
    ```
    If `s` is purely whitespace (e.g. `"   \n  "`), `start` becomes equal to `end`. The guard `if start < end` evaluates to false, returning the original whitespace string instead of `""`. This causes JSON unmarshalling to fail.

### 3.3 Silent Error Propagation in Go Express Client
The Go sidecar Client (`agent/internal/infra/express.go`) does not verify HTTP status codes before parsing responses:
```go
// Example in agent/internal/infra/express.go
func (c *ExpressClient) GetConfig(ctx context.Context, key string) (string, error) {
    ...
    resp, err := c.httpClient.Do(req)
    // No check for resp.StatusCode == 200 OK!
    var result string
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return "", fmt.Errorf("failed to decode config response: %w", err)
    }
    return result, nil
}
```
If the Express server encounters an error (e.g., returns 500 Internal Server Error or 401 Unauthorized with a JSON object `{ "error": "unauthorized" }`), the client ignores the status code and attempts to decode it as a plain string. This either crashes with a JSON decoding error or assigns the error message payload to the configuration variable.

---

## 4. Unused / Orphaned Code

### 4.1 Dead / Orphaned Files
*   [tests/aiRouting.test.ts](file:///C:/Users/zephy/Documents/Raw-Code/tests/aiRouting.test.ts) — Completely broken imports (`../src/services/aiService`, `../src/config/models`). Cannot compile or execute under the current directory layout.
*   [server/migrations/001_init.sql](file:///C:/Users/zephy/Documents/Raw-Code/server/migrations/001_init.sql) — Contains PostgreSQL syntax (`UUID`, `JSONB`) which is incompatible with the server's better-sqlite3 database. It is never run; `server/src/db.ts` contains the active migrations in a hardcoded template string.
*   `core/eval/` — Empty directory stub containing only `.gitkeep`.
*   `core/tasks/` — Empty directory stub containing only `.gitkeep`.
*   `agent/prompts/` — Empty directory stub. Real Go prompts are stored in `agent/internal/agent/prompts/`.
*   `agent/test_diag.txt` — Scrap diagnostic output file left in the repo.

### 4.2 Unused Exports & Code Blocks
*   **`ToolResult`:** Defined in `core/types.ts` but never imported or utilized. All tool results are handled dynamically or as raw payloads.
*   **`ToolRegistry`:** The class `ToolRegistry` in `core/tools/registry.ts` is never instantiated or imported in the project. Tools are loaded statically via `allTools` arrays.
*   **`getCompressedTree()`:** Declared in `core/workspace/FileSystemService.ts` but has zero callers.
*   **MCP Client in Go:** Implemented in `agent/pkg/mcp/client.go` but never registered, instantiated, or wired into the Go Orchestrator or HTTP endpoints. It is dead code.

---

## 5. Dependency Audit

### 5.1 Redundant CodeMirror Language Packages
The root `package.json` installs 17 CodeMirror language packages. While `src/components/artifact/CodePreview.tsx` successfully imports all of them to support syntax highlighting in preview panes, the virtual filesystem editor [src/ide/Editor.tsx](file:///C:/Users/zephy/Documents/Raw-Code/src/ide/Editor.tsx) only imports 7 of them (`javascript`, `html`, `css`, `json`, `markdown`, `python`, `rust`). The remaining 10 packages are only utilized in previews.

### 5.2 devDependencies Audit
*   `fallow` (`^2.89.0`): The codebase intelligence CLI tool is installed as a development dependency but is **never referenced** in any package scripts, configuration files, or CI actions.
*   `@testing-library/react` & `jsdom`: Only 1 test uses these dependencies; the remaining 4 are mock-heavy unit tests.

### 5.3 Oversized Dependencies
*   `@hugeicons/core-free-icons` and `@hugeicons/react` occupy ~3.8MB.
*   `mermaid` (`11.15.0`) occupies ~1.5MB and is only loaded to render simple flowcharts in assistant markdown bubbles.

---

## 6. Agent-Specific Weaknesses

### 6.1 Context Loading Strategy: Weak
*   **Efficiency:** Very poor. When inside a project, `getSmartSystemPrompt()` dumps the entire project directory tree and the contents of *all* files up to a 60,000 character hard cap directly into the system prompt.
*   **Context Bloat:** This context dump is prepended to the prompt on **every single message** in a session, even for simple greetings. It incurs massive token usage, high latencies, and rapid rate-limiting (as observed in API quota limits). There is no selective RAG or "file-focus" tool for the model to request files on demand.

### 6.2 Edits Application: Weak
*   **Robustness:** Fragile. TypeScript tools use Git-merge-style conflict markers to apply changes. However, as noted in Section 3.1, the underlying Go execution tool (`edit_file`) does not support diffs, expecting `old_string` and `new_string` instead. When this is resolved, string search-and-replace will only replace the first matching occurrence. If a file contains duplicate blocks of code, this can result in silent misapplications.

### 6.3 runaway Loop Guardrails: Adequate
*   **TS Loop:** Vercel AI SDK is set to `maxSteps: 20` and `maxRetries: 2` in `streamText()`.
*   **Go Loop:** Go sub-agents are constrained by `MaxSteps` (defaulting to 10).
*   **Missing Guardrail:** There are no cost limits, token caps, or global timeouts at the session level. A background loop (e.g. from `ScheduledTaskManager`) could execute indefinitely, consuming significant tokens.

### 6.4 Evaluation / Output Verification: Missing
*   **Blind Trust:** The agent trust model outputs blindly. After writing/editing files, the agent does not compile the code, run standard linters, or check unit tests to verify that it hasn't introduced syntax or logical errors.

---

## 7. Recommendations

### DELETE PERMANENTLY
1.  **`core/mode/` (Entire Directory):** Highly confident. It is a redundant wrapper that forwards calls directly to `core/agents/`. Refactor references in `ChatPage.tsx`, `ChatInput.tsx`, and `aiService.ts` to use `core/agents/` directly.
2.  **`core/tools/registry.ts`:** Speculative dead code. The registry class is never instantiated; remove it.
3.  **`server/migrations/001_init.sql`:** Orphaned Postgres-specific migration. Database setup is handled inside `server/src/db.ts`.
4.  **`core/eval/` and `core/tasks/` directories:** Placeholder stubs containing only `.gitkeep`.
5.  **`agent/agent.exe`:** Duplicate binary located outside the build output target (`agent/build/`). It should be deleted and excluded via `.gitignore`.
6.  **`agent/test_diag.txt`:** Stray test artifact.

### REWRITE FROM SCRATCH
1.  **TypeScript-to-Go Tool Bridge (`core/tools/` and `agent/internal/tool/`):** The two layers have drifted, resulting in broken tools (e.g., `edit_file` schema mismatch).
    *   *Solution:* Eliminate manually written TypeScript stubs. Expose tool definitions dynamically from the Go agent via `/api/tools`, and auto-generate the Vercel AI SDK tool shapes in React at runtime. This will keep parameters synchronized.
2.  **Context Injection Controller (`core/memory/contextController.ts`):** Dumping up to 60,000 characters of source code on every message is untenable.
    *   *Solution:* Implement a file-retrieval tool (`read_file` / `code_search`) and let the model select context on demand, rather than prepending the entire project to the system prompt.

### REFACTOR / IMPROVE
1.  **`tests/aiRouting.test.ts`:** Correct import paths to point to `@core/models/aiService` and `@core/config/models` and update test assertions to match the current router.
2.  **Go Express Client (`agent/internal/infra/express.go`):** Ensure every HTTP request checks for a `200 OK` status code before decoding JSON bodies.
3.  **`vitest.config.ts`:** Fix the coverage path from `src/server/**/*.ts` to `server/src/**/*.ts` and `core/**/*.ts`.
4.  **Go Parser (`agent/internal/agent/orchestrator.go`):** Fix the bug in `stripMarkdownJSON` so that purely whitespace inputs return `""` rather than triggering JSON parsing failures.

---

## 8. Quick Wins vs Deep Work

### Quick Wins (< 1 Hour Each)
*   [ ] Delete `core/mode/` folder and update imports in `ChatPage.tsx` and `aiService.ts`.
*   [ ] Add `*.exe` to `agent/.gitignore` and delete `agent/agent.exe` and `agent/build/xz-agent.exe` from Git tracking.
*   [ ] Fix broken imports and mocks in `tests/aiRouting.test.ts`.
*   [ ] Correct the coverage paths in `vitest.config.ts`.
*   [ ] Remove empty folder stubs: `core/eval/`, `core/tasks/`, and `agent/prompts/`.
*   [ ] Fix `stripMarkdownJSON` in `agent/internal/agent/orchestrator.go` to handle whitespace-only inputs correctly.
*   [ ] Delete `agent/test_diag.txt`.

### Deep Work (Multi-Day Design)
*   [ ] **Fix the Tool Mismatch:** Align the parameter schema of TS and Go `edit_file` (either migrate Go to Git diff format or adjust TS to send `old_string` / `new_string`).
*   [ ] **API Key Consolidation:** Migrate all configuration values to the Express SQLite DB and remove double-storage logic in `localStorage`.
*   [ ] **Token-Aware Context Truncation:** Add token counting and dynamic message pruning in `aiService.ts` before calling LLMs.
*   [ ] **On-Demand Context Loading:** Implement a workspace search system and remove the massive system prompt files dump.
*   [ ] **Post-Edit Verification Loop:** Wire `npm run lint` and `npm run type-check` tool executions into the file-writing process to ensure agent modifications don't break the code.
*   [ ] **Sandboxing:** Implement shell containerization or command white-listing to prevent unsafe command execution.
