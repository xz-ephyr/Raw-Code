# What actually makes a coding-agent harness "good" (Claude Code / Codex CLI / OpenCode level)

A "harness" is everything *around* the LLM — the loop, tools, memory, and guardrails that turn a raw model into something that reliably ships working code. The model is maybe 30% of quality. The other 70% is this. Here's what separates the good ones from a basic wrapper:

---

## 1. The Agentic Loop (this is the core)

Bad harnesses: one prompt → one response → apply blindly.

Good harnesses run a **loop**:
```
plan → act (tool call) → observe result → re-plan → repeat until done or budget exhausted
```
Key traits:
- The model can call tools **multiple times per turn** without you re-prompting it manually.
- Every tool result gets fed back into context automatically.
- There's a **stop condition**: task complete, max iterations hit, or user intervention needed — never infinite loops.
- The loop is resumable — if it crashes at step 7, you don't lose steps 1-6.

If your harness is "send prompt → get full file rewrite → save it," that's the #1 thing to fix.

---

## 2. Tools, not just chat

Claude Code/Codex don't ask the model to output whole files in markdown. They give the model **structured tools** it calls explicitly:

| Tool | Purpose |
|---|---|
| `read_file(path, line_range)` | Read exact slices, not whole huge files |
| `edit_file(path, old_string, new_string)` | Surgical diff-style edits, not full rewrites |
| `write_file(path, content)` | Only for new files |
| `run_command(cmd)` | Execute shell/tests, sandboxed |
| `grep`/`glob`/`search_codebase` | Find things without loading everything into context |
| `list_directory` | Explore structure cheaply |
| `web_search` | for doing life search |

**Critical detail:** edits should be **diff/patch-based** (find old text → replace with new text), not "rewrite the whole file." Full-file rewrites are:
- Token-expensive
- Error-prone (model drops unrelated code, hallucinates minor parts)
- Cause merge/formatting drift

This is probably one of the biggest gaps in home-built harnesses.

---

## 3. Context management (the make-or-break part)

Dumb harnesses: dump entire repo or entire file into every prompt. This is slow, expensive, and actually makes the model *worse* (needle-in-haystack degradation).

Good harnesses:
- **Lazy loading** — only read files the agent explicitly asks for, based on a search/plan step first.
- **Chunked/partial reads** — read specific line ranges, not whole 3000-line files.
- **Compaction/summarization** — when context gets long, old tool outputs get summarized/dropped, keeping only what's still relevant.
- **A repo map/index** — a lightweight structural overview (file tree + signatures) is kept in context always, full file contents only pulled on demand.
- **Session memory across turns** — persisted state (what files were touched, what the plan is) so it doesn't re-derive everything each turn.

If you're sending the whole repo every request, that's your top fix.

---

## 4. Planning before acting

Best harnesses force an explicit **plan step** before code changes:
1. Understand the task
2. Search/read relevant files
3. Write a short plan (steps, files to touch)
4. Execute step by step, checking after each one
5. Verify at the end

Naive harnesses skip straight to "here's the edit" — which works for tiny tasks and falls apart on anything multi-file or nontrivial.

---

## 5. Self-verification loop

This is what separates "good demo" from "actually usable tool":
- After an edit, **run the code / run tests / run a linter** automatically.
- Feed errors back to the model as a tool result.
- Let it retry with the error in context (bounded retries, e.g. max 3-5).
- Never mark a task "done" just because the model said "Done!" — check it actually compiles/passes.

If your harness has no automatic "did this actually work" check, this is a top-3 priority fix.

---

## 6. Robust patch application

Models produce malformed diffs sometimes (wrong whitespace, ambiguous match, etc). Good harnesses:
- Validate the patch before applying (does `old_string` actually exist exactly once in the file?).
- If ambiguous/failed, **feed the error back to the model** to retry the edit rather than crashing or silently corrupting the file.
- Keep a backup/diff log so changes are revertible.

A fragile "just string-replace and hope" implementation is a classic failure point.

---

## 7. Permissions & sandboxing

Mature tools have:
- Explicit allow-list for shell commands (or ask-before-run for risky ones like `rm`, `git push`, network calls).
- File write scoped to the project directory only.
- A dry-run/plan mode (what you'll use for the audit above).

If your agent can run arbitrary shell commands with no gate, that's a real risk and also a place users lose trust.

---

## 8. Model/provider abstraction

Don't hardcode one API. Structure it as:
```
Agent Core (loop, tools, context) 
   ↕ 
Provider Adapter Layer (OpenAI / Anthropic / local models)
```
This lets you swap models without rewriting the harness, and lets you use a cheap/fast model for search/planning and a stronger model for the actual code generation (cost + speed optimization mature tools do).

---

## 9. Sub-agents / task decomposition (advanced tier)

Claude Code and similar spin up **sub-agents** for isolated sub-tasks (e.g., "search the codebase for X" runs as its own contained agent call, returns a summary, doesn't pollute main context). This keeps the main loop's context clean and lets parallel exploration happen. Not essential for v1, but it's what separates "good" from "excellent."

---

## 10. Observability

You need to see what the agent is doing:
- Log every tool call, its input, its output.
- Show the plan to the user before/while executing.
- Track token usage per turn so you catch context bloat early.

Without this, you can't debug why the agent "does the wrong thing" — you're flying blind.

---

## TL;DR — priority order if you're rebuilding

1. Switch from full-file-rewrite to diff/patch-based editing
2. Build a real tool-calling loop (multi-step, not one-shot)
3. Add lazy context loading (search/read on demand, not dump-everything)
4. Add a self-verification step (run tests/lint after edits, feed errors back)
5. Add a planning step before execution
6. Add basic sandboxing/permissions
7. Abstract the model provider layer
8. Add logging/observability

---

Once you get those two audit reports back, I can map their findings directly onto this list and tell you exactly which of these 8 things your current build is missing or doing wrong — that's the real diagnosis step.