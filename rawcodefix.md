# Combined Diagnosis: What's Actually Wrong With "xz" (Raw-Code)

I read both full reports. Good news: they independently converged on almost the exact same root causes, which means these aren't opinions — they're real, verified problems. Let me give you the unified picture.

---

## 🎯 The One Sentence Diagnosis

**You built two full coding agents (a TypeScript one and a Go one) that don't agree with each other, glued them together with HTTP, and the seams are broken.** Everything else — the bloat, the dead code, the fragility — flows from this one architectural decision.

Both auditors independently said some version of: *"the system feels like two separate projects glued together with HTTP stubs."*

---

## 🔴 The #1 Critical Bug (both tools found this independently — fix TODAY)

**File editing is completely broken.**

- TypeScript sends: `{ path, diff }` using git-conflict-marker format (`<<<<<<< SEARCH`)
- Go expects: `{ path, old_string, new_string }`
- Result: every `edit_file` call throws `"old_string is required"` and fails

This means **your agent cannot edit files right now.** This alone explains why it "doesn't work like the professional tools" — the single most important tool in a coding agent (editing code) is non-functional due to a schema mismatch between two layers that drifted apart.

**Fix immediately:** Pick one format. Recommendation: use `old_string`/`new_string` (exact match replace) since that's the Go implementation and it's what Claude Code/OpenCode actually use. Update the TS tool definition to match. This is a 30-minute fix that will change how the whole app feels to use.

---

## 🔴 The #2 Critical Problem: Context Bloat (both tools flagged this as the biggest quality issue)

- You dump the **entire file tree + file contents up to 60,000 characters** into the system prompt, **on every single message**, even a simple "hi."
- No token counting, no truncation strategy beyond a crude "keep last N messages" fallback.
- Both reports called this the single biggest lever for improving output quality.

This is why your agent probably feels dumber than Claude Code on the same model — you're burying the actual task under a wall of irrelevant file contents every turn, causing needle-in-haystack degradation, rate-limit issues, and high latency/cost.

**Fix:** Stop prepending the whole repo. Give the model a `read_file`/`search_codebase` tool and let it pull in only what it needs, on demand. This is literally how every professional harness (Claude Code, Codex, OpenCode) works — lazy loading, not eager dumping.

---

## 🟠 The Root Architectural Mistake: Triple Duplication of Tools

Both audits mapped this out identically:

```
File read/write/edit exists in THREE places:
1. Go sidecar (agent/internal/tool/*.go)          ← the real implementation
2. TypeScript proxies (core/tools/code/*.ts)      ← just HTTP stubs calling Go
3. FileSystemService (core/workspace/...)         ← a THIRD independent implementation (Tauri/DB/localStorage)
```

Same story for web search (TS → Express, AND Go → Express — two paths hitting the same server), and for agent persona definitions (duplicated in TS `core/agents/` and Go `.md` files).

This isn't just "bloat" — it's the actual mechanism causing bugs like the edit_file mismatch. Every time you change one side, the other silently drifts out of sync, because there's no single source of truth.

**Decision you need to make (this is the real fork in the road):**
- **Option A:** Go is the source of truth for all tool execution. TypeScript should not hand-write tool stubs — it should fetch the tool schema from Go's `/api/tools` endpoint dynamically and generate the AI SDK tool wrappers at runtime. (Both reports recommended this independently.)
- **Option B:** Kill the Go agent's file tools entirely, run file operations directly in TypeScript/Tauri (native FS access), and use Go *only* for what it's actually good at — background task orchestration, sub-agent parallelism.

Given you already have Tauri (native filesystem access), **I'd lean toward Option B for file ops** — running file read/write directly in TS when in Tauri avoids a whole HTTP round trip layer (both reports flagged the HTTP-per-tool-call overhead as real, measurable latency: 50-500ms per multi-tool session). Keep Go for what actually needs a separate process: long-running background tasks, parallel sub-agents.

Either way — **stop maintaining two parallel implementations of the same tools.** This is your biggest structural debt.

---

## 🟠 Things Both Reports Agreed Are Just Broken (not architecture — actual bugs)

| Issue | Where | Fix effort |
|---|---|---|
| `tests/aiRouting.test.ts` imports paths that don't exist | tests/ | 15 min |
| Go's `stripMarkdownJSON` returns whitespace instead of `""` when input is all-whitespace, breaking JSON parsing | `agent/internal/agent/orchestrator.go` | 15 min |
| `ExpressClient` never checks HTTP status codes before parsing JSON — silently corrupts data on server errors | `agent/internal/infra/express.go` | 30 min |
| `vitest.config.ts` coverage path points to `src/server/` which doesn't exist — coverage is currently measuring nothing | `vitest.config.ts` | 5 min |
| Several Go unit tests have assertions that contradict the actual (correct) code behavior — the tests are wrong, not the code | `agent/internal/**/*_test.go` | 30 min |
| Two 10.6MB `.exe` binaries committed to git | `agent/agent.exe`, `agent/build/xz-agent.exe` | 5 min |

None of these are hard. They're just neglected. Do all of these in one sitting — it's maybe 2 hours total and removes a bunch of noise/risk.

---

## 🟠 Confirmed Dead Code (delete without fear — both audits independently agree)

- `core/mode/` — entire directory, literally `MODES = AGENTS`, zero unique logic
- `core/tools/registry.ts` — `ToolRegistry` class, never instantiated anywhere
- `core/eval/`, `core/tasks/`, `agent/prompts/` — empty stub directories
- `server/migrations/001_init.sql` — Postgres syntax against a SQLite DB, never runs
- `agent/pkg/mcp/client.go` — MCP client built but never wired into anything
- `core/workspace/FileSystemService.ts` → `getCompressedTree()`, `uploadProjectFiles()` — zero callers
- `core/types.ts` → `ToolResult` type — never used
- `agent/test_diag.txt` — stray leftover file

**Delete all of this today.** It's not helping you, and both independent tools agree it's inert.

---

## 🟡 What "Missing" vs Claude Code/Codex/OpenCode (ties back to what I told you earlier)

Both audits confirm, point for point, the harness gaps I described:

| Harness component | Your status | Confirmed by |
|---|---|---|
| Diff-based editing | **Broken** (schema mismatch) | Both |
| Lazy context loading | **Missing** (dumps everything) | Both |
| Token-aware truncation | **Missing** | Both |
| Post-edit verification (lint/test after edit) | **Missing entirely** | Both |
| Explicit planning phase before execution | **Naive** (exists in prompt only, not architecture) | OpenCode |
| Sandboxing/permissions | **Naive** (path traversal check only, no command allowlist) | Both |
| Model provider abstraction | **Good** — this is actually done well | OpenCode |
| Runaway loop guardrails | **Adequate** at step level, missing at session/cost level | Both |

So — good news — your provider abstraction and basic loop guardrails are actually fine. The core gaps are exactly the ones I flagged as top priority in general: **editing, context management, and verification.**

---

## ✅ My Recommended Order of Operations

**Week 1 — Stop the bleeding (get it actually functional)**
1. Fix `edit_file` schema mismatch (30 min) — nothing else matters until this works
2. Delete all confirmed dead code above (1-2 hrs)
3. Fix the 6 concrete bugs table above (2 hrs)
4. Remove `.exe` binaries from git, add to `.gitignore`

**Week 2 — Fix the quality killer**
5. Stop dumping full repo into every system prompt. Implement on-demand `read_file`/`search_codebase` instead of eager context injection
6. Add basic token counting + truncation before every LLM call

**Week 3 — Close the trust gap**
7. Add post-edit verification: run lint/type-check after every file edit, feed errors back to the model, let it self-correct
8. Add an explicit plan-then-execute step for non-trivial tasks instead of single-shot streaming

**Week 4 — Architecture cleanup (bigger decision)**
9. Decide Go vs TS as source of truth for tools (I'd recommend TS+Tauri for file ops, Go for background/parallel orchestration only)
10. Consolidate API key storage to one source (Express DB), stop the localStorage/DB dual-write drift

---

## Bottom line

Your instincts to build this were right, and the bones (provider abstraction, having a Go sidecar for heavier work, Tauri for native access) are reasonable. What's making it "not work like the professional ones" is **not** that you need a fundamentally different design — it's that:
1. A core tool is literally broken (edit_file),
2. You're context-flooding every request, and
3. You built the same functionality twice in two languages and let them drift.

Fix #1 today. Fix #2 this week. That alone will make it feel dramatically closer to Claude Code, because those two things directly control "can it edit code" and "does it stay smart/fast as the session goes on" — which are exactly the two things that make agentic coding tools feel broken when they're missing.

Want me to write you the actual corrected `edit_file` tool definition (TS side) so it matches the Go `old_string`/`new_string` contract, and a first-pass on-demand context loading design? Those are the two changes that will move the needle the most, right now.