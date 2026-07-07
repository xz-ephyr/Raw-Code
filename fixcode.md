# Refactoring & Harness Architecture Plan (`fixcode.md`)

> **Source Synthesis:** This document combines the **OpenCode Audit** (`AUDIT_OPENCODE.md`), the **Antigravity Audit** (`AUDIT_ANTIGRAVITY.md`), the **Claude harness principles** (`clauderep.md`), and a **fresh codebase trace** by the current auditor (verifying every claim against actual source files).

---

## 1. The 7 Essential Tools (Refactoring Target)

Lines 29-37 of `clauderep.md` define the canonical toolset of a mature coding harness. **These 7 tools are all we keep.** Everything else is deleted.

| Tool | Canonical Signature | Replaces |
|---|---|---|
| **`read_file`** | `(path, start_line?, end_line?)` | current `readFile` + `findFiles` + `codeSearch` + `fileStats` + `countLines` |
| **`edit_file`** | `(path, old_string, new_string)` | current broken `editFile` (Git conflict markers) |
| **`write_file`** | `(path, content)` | current `writeFile` |
| **`run_command`** | `(cmd, timeout?)` | current `runCommand` + `listProcesses` + `systemInfo` + `resolvePath` + ALL git tools |
| **`search_codebase`** | `(query, pattern?, path?)` | merges `grep_files` + `glob_files` into one tool |
| **`list_directory`** | `(path?)` | current `listDirectory` |
| **`web_search`** | `(query)` | current `webSearch` + `fetchPage` + `imageSearch` + `newsSearch` |

**Delete list (tools to remove):**
- `core/tools/code/findFiles.ts`, `codeSearch.ts`, `fileStats.ts`, `countLines.ts`
- `core/tools/git/` — **entire directory** (use `run_command("git status")` etc.)
- `core/tools/system/systemInfo.ts`, `listProcesses.ts`, `resolvePath.ts`
- `core/tools/network/httpRequest.ts`, `checkUrl.ts`
- `core/tools/web/webSearch.ts`, `fetchPage.ts` (orphaned; superseded by `webSearchTool.ts`)
- `core/tools/writeArtifactTool.ts` (merge into main tool array, don't inject separately)
- `core/tools/allTools.ts` (replace with explicit 7-tool array)
- `core/tools/registry.ts` (dead code, never instantiated)
- All Go-side git tools: `agent/internal/tool/git_*.go` (replace with `run_command`)

---

## 2. What a "Good Harness" Looks Like

The model is 30% of quality. The harness is 70%. These 8 principles from `clauderep.md` define the target:

### 2.1 The Agentic Loop
- **Plan → Act → Observe → Replan** — not "one prompt, pray it works"
- Multiple tool calls per turn, results fed back automatically
- Clean stop condition: task done, max steps, or user intervention
- Resumable: crash at step 7 doesn't lose steps 1-6

### 2.2 Structured Tools (the 7 above)
- Diff/patch-based editing (surgical, not full-file rewrites)
- Line-range reads (chunked, not whole huge files)
- Search/explore via `search_codebase` + `list_directory` (not dumping everything)

### 2.3 Lazy Context Loading
- Only files the model asks for (via explicit `read_file` calls)
- Chunked/partial reads with line ranges
- Compaction/summarization when context gets long
- Lightweight repo map always in context; full contents on demand only

### 2.4 Planning Phase
- Explicit plan step before code changes: understand → search → plan → execute → verify
- Naive harnesses skip straight to "here's the edit" and fail on multi-file tasks

### 2.5 Self-Verification Loop
- After every edit: auto-run linter + type-check + tests
- Feed errors back to the model as tool results
- Bounded retries (max 3-5) — never mark "Done!" without verification

### 2.6 Robust Patch Application
- Validate `old_string` exists exactly once in the file before applying
- On failure, feed error back to model to retry (no silent corruption)
- Keep a diff log for revertibility

### 2.7 Permissions & Sandboxing
- Command allowlist + blocklist (not "ask with a prompt warning")
- File writes scoped to project directory
- Dry-run/plan mode

### 2.8 Model/Provider Abstraction
- Currently good (6 providers via Vercel AI SDK), but missing: cost-aware routing, per-task model selection, latency tracking

---

## 3. Combined Diagnosis: What This Project Is Doing Wrong

### 3.1 Critical: `edit_file` Is Completely Broken (FOUND BY BOTH AUDITS)
The TS schema sends `{ path, diff }` (Git conflict markers). The Go handler expects `{ path, old_string, new_string }`. Result: every edit attempt fails with `"old_string is required"`. **The model cannot edit files.**

**Fix:** Standardize on `old_string` / `new_string` (Go's format). Remove Git conflict marker parsing. Update `core/tools/code/editFile.ts`.

### 3.2 Critical: 7 TS Tools Call Go Handlers That Don't Exist (NEW FINDING)

Traced every `callGoTool()` call against the Go registry. **These tools silently return 404:**

| TS Tool | Calls Go Tool | Go Handler Exists? |
|---|---|---|
| `findFiles.ts` | `find_files` | **NO** |
| `codeSearch.ts` | `code_search` | **NO** |
| `fileStats.ts` | `file_stats` | **NO** |
| `countLines.ts` | `count_lines` | **NO** |
| `runCommand.ts` | `run_command` | **NO** |
| `listProcesses.ts` | `list_processes` | **NO** |
| `resolvePath.ts` | `resolve_path` | **NO** |

These tools **fail silently** — the 404 is caught by `fetchWithRetry`, which returns an error message, but no one checks it. The model may call these and get garbage back.

**Fix:** Delete all 7 (they're not in the 7-tool target anyway).

### 3.3 Critical: Zero Cost/Tracking/Guardrails (NEW FINDING)

- **No token counting** anywhere — not before `streamText()`, not after
- **No cost tracking** — usage objects from the AI SDK are never stored
- **No session-level guardrails** — no budget caps, no idle timeout, no max-cost limit
- **No analytics** — zero telemetry, no usage reporting

The only "tracking" is a `Set<AIModel>` in localStorage to avoid retrying failed models. A runaway agent could burn unlimited tokens with no circuit breaker.

### 3.4 High: Triple-Duplicated File Operations (FOUND BY BOTH AUDITS)

File operations exist in 3 places:
1. Go sidecar (`agent/internal/tool/read_file.go` etc.)
2. TypeScript proxies (`core/tools/code/readFile.ts` → HTTP → Go)
3. FileSystemService (`core/workspace/FileSystemService.ts` — 347 lines, triple-backend)

Every read/write goes: **Frontend → TS tool → HTTP POST → Go agent → Filesystem**. The TS proxies add zero value — just latency and a failure point.

### 3.5 High: Context Dump on Every Turn (FOUND BY BOTH AUDITS)

`getSmartSystemPrompt()` dumps the entire project tree + file contents (up to 60K chars) into **every** system prompt. Even for "hello" or "what's 2+2?" — 20K+ bytes of boilerplate before the model can respond.

Compare to mature harnesses that keep only a lightweight directory tree and let the model `read_file` on demand.

### 3.6 High: No Post-Edit Verification (FOUND BY BOTH AUDITS)

After writing or editing a file, nothing checks if the code compiles, lint passes, or tests pass. The model says "Done!" and everyone trusts it. This is the #1 difference between a demo and a production tool.

### 3.7 Medium: `core/mode/` Is Pointless (FOUND BY BOTH AUDITS)

5 files that are 1:1 wrappers around `core/agents/`. `MODES === AGENTS`. `ModeSkill.execute` is never implemented. Delete it.

### 3.8 Medium: Go Express Client Ignores HTTP Status Codes (FOUND BY ANTIGRAVITY)

`agent/internal/infra/express.go` decodes JSON responses without checking `resp.StatusCode`. A 500 or 401 error gets parsed as a config string, leading to silent data corruption.

### 3.9 Medium: Go `stripMarkdownJSON` Fails on Whitespace-Only Input (FOUND BY ANTIGRAVITY)

If `s` is `"   \n  "`, `start >= end` and the function returns the original whitespace string instead of `""`, causing JSON parse failures.

### 3.10 Medium: `search_docs` Referenced in UI, Doesn't Exist (NEW FINDING)

`ThinkingTimeline.tsx:85` has display config for `search_docs`, but no tool definition exists. Leftover from a deprecated feature.

### 3.11 Low: Broken Tests & Stale Config (FOUND BY BOTH AUDITS)

- `tests/aiRouting.test.ts` imports from non-existent paths (`../src/services/aiService`)
- `vitest.config.ts` coverage targets `src/server/**/*.ts` (empty)
- `agent/agent.exe` and `agent/build/xz-agent.exe` (21 MB) committed to git
- Pre-compiled binaries, empty dir stubs (`core/eval/`, `core/tasks/`, `agent/prompts/`), stray `agent/test_diag.txt`

### 3.12 Low: Dual Tool Registration Format (NEW FINDING)

Two tool formats coexist (`ToolDef` interface + `ai/tool()` helper), creating a fragile reduce loop with `isAlreadyWrapped` heuristic. Normalize everything to `tool()`.

### 3.13 Low: `writeArtifactTool` Injected Separately (NEW FINDING)

It's spread into `streamText()` outside the `allTools` array, making it invisible to the allTools pipeline. Merge it into the 7-tool array.

---

## 4. My Assessment Summary

Reading every file these audits reference and tracing every code path:

**Strengths:**
- The provider abstraction is genuinely good (6 providers via Vercel AI SDK, clean fallback chains)
- The Go sidecar's tool registry pattern is the right architectural choice (thread-safe, extensible)
- The UI rendering pipeline for tool invocations is comprehensive (27 tool display configs)
- Resumable sessions via SQLite persistence work correctly

**Weaknesses (beyond what audits found):**
- The project has **more dead code than live code** — the actual working path is a narrow channel through a swamp of orphaned files, legacy formats, and unimplemented stubs
- **No one has ever run these tools end-to-end** — if they had, the 7 missing Go handlers would have been caught immediately
- **The tool count (27+) actively harms the model** — more tools = more decision surface = more wrong choices. The 7-tool consolidation is the single most impactful change
- **No observability** — you can't tell if the agent is working or broken without reading source code. The UI shows tool calls, but there's no logging, no tracing, no metrics

**Priority:**
1. Must fix: `edit_file` schema mismatch (blocking feature)
2. Must fix: delete broken/missing tools (7 tools that silently fail)
3. Must add: token counting + cost guardrails (prevents runaway bills)
4. Must add: post-edit verification (turns demo into tool)
5. Should fix: context lazy loading (reduces cost 3-5x)
6. Should fix: delete dead code (reduces maintenance surface)
7. Nice: session-level guardrails, analytics, sandboxing

---

## 5. Step-by-Step Action Plan

### Phase 1: Emergency Fixes (do first)
- [ ] **Fix `edit_file`:** Change TS schema from `{ path, diff }` to `{ path, old_string, new_string }`. Remove Git conflict marker parsing. Test end-to-end.
- [ ] **Delete broken TS tool definitions:** Remove `findFiles`, `codeSearch`, `fileStats`, `countLines`, `runCommand` (recreate in Go), `listProcesses`, `resolvePath`. These call non-existent Go handlers.
- [ ] **Implement `run_command` in Go:** Add `agent/internal/tool/run_command.go` — this is essential for self-verification (running lint/tests).

### Phase 2: Consolidate to 7 Tools
- [ ] **Normalize all tools to `tool()` helper format:** Eliminate the `ToolDef` interface. Eliminate the fragile reduce loop.
- [ ] **Delete `core/tools/git/` entirely:** Git operations use `run_command("git <subcommand>")`.
- [ ] **Delete `core/tools/network/` entirely:** HTTP requests use `run_command("curl ...")`.
- [ ] **Merge `webSearch`, `fetchPage`, `imageSearch`, `newsSearch` into one `web_search` tool** with a `type` parameter.
- [ ] **Merge `grep_files` and `glob_files` into `search_codebase`** with `query` and optional `pattern` parameters.
- [ ] **Remove `writeArtifactTool` separate injection:** Add it to the main `allTools` array.
- [ ] **Rewrite `allTools.ts`:** Export an explicit array of exactly 7 tools.
- [ ] **Rename Go-side tools to match:** `grep_files` → `search_codebase`, remove git tools.

### Phase 3: Harness Improvements
- [ ] **Add token counting** before `chatCompletion()` — estimate context usage, truncate when approaching model limits.
- [ ] **Add cost tracking** — capture `usage` from AI SDK stream, accumulate per session.
- [ ] **Add session-level guardrails** — max cost per session, max steps, idle timeout.
- [ ] **Implement lazy context loading** — remove file contents from system prompt; keep only directory tree; instruct model to use `read_file` on demand.
- [ ] **Add post-edit verification** — after `edit_file`/`write_file`, run `run_command("npm run lint")` and `run_command("npm run type-check")`. Feed errors back to model. Revert on repeated failure.
- [ ] **Add planning step** — before tool execution, force a structured plan generation step.

### Phase 4: Cleanup & Maintenance
- [ ] **Delete `core/mode/` directory**, update imports in `ChatPage.tsx`, `ChatInput.tsx`, `aiService.ts`.
- [ ] **Delete `core/tools/registry.ts`** (never instantiated).
- [ ] **Delete empty stubs:** `core/eval/`, `core/tasks/`, `agent/prompts/`.
- [ ] **Delete `agent/test_diag.txt`** (stray artifact).
- [ ] **Delete `agent/agent.exe`**, add `*.exe` to `agent/.gitignore`.
- [ ] **Delete `server/migrations/001_init.sql`** (PostgreSQL syntax, never used).
- [ ] **Fix `tests/aiRouting.test.ts`** imports → `@core/models/aiService`.
- [ ] **Fix `vitest.config.ts`** coverage paths → `server/src/**/*.ts` and `core/**/*.ts`.
- [ ] **Fix Go `stripMarkdownJSON`** to return `""` on whitespace-only input.
- [ ] **Fix Go Express client** to check `resp.StatusCode` before decoding.
- [ ] **Remove `search_docs` from `ThinkingTimeline.tsx`** display config (no tool exists).
- [ ] **Delete orphaned files:** `core/tools/web/webSearch.ts`, `core/tools/web/fetchPage.ts`.

---

## 6. Tool File Inventory (Accountability Matrix)

| File | Status | Action |
|---|---|---|
| `core/tools/code/readFile.ts` | KEEP | Rename to `readFile.ts`, use line ranges |
| `core/tools/code/editFile.ts` | **REWRITE** | Schema is wrong (diff → old_string/new_string) |
| `core/tools/code/writeFile.ts` | KEEP | Works, just new files |
| `core/tools/code/listDirectory.ts` | KEEP | Already matches canonical |
| `core/tools/code/findFiles.ts` | DELETE | Broken (Go 404), merge into search_codebase |
| `core/tools/code/grepFiles.ts` | DELETE | Merge into search_codebase |
| `core/tools/code/globFiles.ts` | DELETE | Merge into search_codebase |
| `core/tools/code/codeSearch.ts` | DELETE | Broken (Go 404) |
| `core/tools/code/fileStats.ts` | DELETE | Broken (Go 404), unnecessary |
| `core/tools/code/countLines.ts` | DELETE | Broken (Go 404), unnecessary |
| `core/tools/git/gitStatus.ts` | DELETE | Use `run_command("git status")` |
| `core/tools/git/gitDiff.ts` | DELETE | Use `run_command("git diff")` |
| `core/tools/git/gitLog.ts` | DELETE | Use `run_command("git log")` |
| `core/tools/git/gitBranches.ts` | DELETE | Use `run_command("git branch")` |
| `core/tools/git/gitShow.ts` | DELETE | Use `run_command("git show")` |
| `core/tools/system/runCommand.ts` | **REWRITE** | Must create Go handler, or run locally |
| `core/tools/system/systemInfo.ts` | KEEP? | If needed, implement via run_command |
| `core/tools/system/listProcesses.ts` | DELETE | Broken (Go 404) |
| `core/tools/system/resolvePath.ts` | DELETE | Broken (Go 404) |
| `core/tools/network/httpRequest.ts` | DELETE | Use `run_command("curl")` |
| `core/tools/network/checkUrl.ts` | DELETE | Use `run_command("curl -I")` |
| `core/tools/web/webSearchTool.ts` | KEEP | Simplify to one tool (not 4) |
| `core/tools/web/webSearch.ts` | DELETE | Orphaned, superseded |
| `core/tools/web/fetchPage.ts` | DELETE | Orphaned, superseded |
| `core/tools/writeArtifactTool.ts` | MERGE | Add to allTools array |
| `core/tools/agent/subagentRun.ts` | KEEP | Advanced feature, keep as-is |

**Go-side tool actions:**
| File | Action |
|---|---|
| `agent/internal/tool/read_file.go` | KEEP |
| `agent/internal/tool/edit_file.go` | KEEP (schema is correct: old_string/new_string) |
| `agent/internal/tool/write_file.go` | KEEP |
| `agent/internal/tool/list_directory.go` | KEEP |
| `agent/internal/tool/grep_files.go` | MERGE into search_codebase |
| `agent/internal/tool/glob_files.go` | MERGE into search_codebase |
| `agent/internal/tool/git_status.go` | DELETE |
| `agent/internal/tool/git_diff.go` | DELETE |
| `agent/internal/tool/git_log.go` | DELETE |
| `agent/internal/tool/git_branches.go` | DELETE |
| `agent/internal/tool/git_show.go` | DELETE |
| `agent/internal/tool/web_search.go` | KEEP |
| `agent/internal/tool/tool.go` (runCmd) | KEEP (used by run_command) |
