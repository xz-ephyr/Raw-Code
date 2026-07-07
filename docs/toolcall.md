# Tool Call Discipline: A Primer for Agents

> Inject this anywhere a model or agent needs to use tools responsibly.  
> The goal: **maximal signal per call, minimal waste.**

---

## 1. First Ask: Do I Even Need a Tool?

Before calling anything, pause:

| Situation | Do this |
|---|---|
| Common knowledge, well-known syntax, standard library docs | Answer from training data. No tool needed. |
| Recent events, package versions, pricing, status pages | Call once. |
| Verifying a specific file's current content | Call `read_file`. |
| "Is this approach correct?" | Answer from knowledge. Only search if you're unsure. |
| User asks for a summary of their own code | Read the code, don't search the web. |
| User asks for a comparison (e.g., React vs Vue) | Answer from knowledge. Search only for specific stats or dates. |

**Rule of thumb:** If you'd answer it in a conversation without tools, do that. Tools are for facts you don't know and state you can't see.

---

## 2. One Call, One Purpose

A single tool call should answer exactly one question.

| ❌ Bad | ✅ Good |
|---|---|
| `find_files pattern="*.ts"` without a specific target | `grep_files pattern="useEffect" include="*.tsx"` — you know what you're looking for |
| `webSearch query="React performance tips"` | `webSearch query="React 19 use() hook performance benefits 2026"` — specific |
| `read_file path="src/"` on a directory (wastes a call) | `list_directory path="src/components/"` |

**Every tool call costs a round-trip.** Make each one count.

---

## 3. Prefer the Narrowest Tool

| Broad / avoid | Narrow / prefer |
|---|---|
| `run_command ls` or `run_command grep` | `list_directory` or `grep_files` — structured output |
| `webSearch` when you need a page's content | `fetchPage` — direct, no search intermediary |
| `grep_files` when you know the filename | `find_files` or `glob_files` — faster |
| `http_request` for a simple URL check | `check_url` — purpose-built |
| `run_command git status` | `git_status` — structured, no shell parsing needed |

**Don't use a sledgehammer on a thumbtack.** Structured tools exist so you don't parse shell output.

---

## 4. Batch Strategically

When you need multiple pieces of information:

| Situation | Approach |
|---|---|
| Need 3 different files | Call them in parallel (the system handles concurrent calls). |
| File A's content determines which file B to read | Sequence them. Call A, inspect result, call B. |
| Web search + fetch page | Search first, then fetch the most promising result. Don't fetch blindly. |
| `git_status` + `git_diff` | Call in parallel — they're independent. |

**Concurrent independent calls** are faster than sequential.  
**Dependent calls** must be sequential — read the result first.

---

## 5. Never Repeat Yourself

If a tool call fails:

1. Adjust your approach (different params, different tool)
2. Try once more
3. If it fails again — **stop**. Inform the user. Do not retry the same call.

If you already have data you need (from a prior call, from the conversation, from training):
- **Do not re-fetch it.** Using old data is better than wasting a call.
- If you did a `read_file`, that content is now in context. Use it for subsequent edits without re-reading.

**Idempotent tools** (reads, searches, status checks) don't need retrying on the same data.  
**Non-idempotent tools** (writes, edits, git operations) should succeed or fail once — don't retry blindly.

---

## 6. Read Before You Write

| Before doing this... | First do this |
|---|---|
| `edit_file` on a file | `read_file` to see current state |
| `write_file` (overwriting) | `read_file` to confirm content isn't lost |
| `git_commit`, `git_branch` | `git_status` and `git_log` |
| Running a command on a path | `list_directory` or `file_stats` to verify path exists |
| Deleting or renaming | Explicit user confirmation + `read_file` to preview |

**You cannot edit what you haven't read.** Never write blind.

---

## 7. Parallelism: Use It, Don't Abuse It

**Good parallel calls (use freely):**
- `read_file` on multiple related files
- `find_files` + `grep_files` for different patterns
- `git_status` + `git_log` 
- `webSearch` + `fetchPage` on different URLs

**Bad parallel calls (avoid):**
- 5+ reads of unrelated files that you won't use — adds noise to context
- `list_directory` on 3+ directories at once without a clear reason
- Multiple searches for the same information with slightly different queries

**Magic number:** 2-4 parallel calls is productive. More than 6 is usually scatter-shot.

---

## 8. Sub-Agent Delegation: When and How

Delegate when a task requires **3+ sequential tool calls** or a **distinct focus**.

**Good delegates:**
- "Research this topic across 5 sources and write a summary"
- "Audit this codebase for X pattern and report findings"
- "This subtask is independent of my main flow"

**Bad delegates:**
- "Read one file and tell me what it does" — just read it yourself
- "Run a single shell command" — run it yourself
- Anything the sub-agent could answer in one tool call

When delegating, be explicit:
- Include the goal, constraints, and expected output format
- Limit tool scope using `toolScope` — don't give unnecessary access
- Set a clear stopping condition

---

## 9. Tool Output Hygiene

| Do | Don't |
|---|---|
| Summarize search results — pull out the 2-3 key facts | Dump raw JSON or full page text into your response |
| Show only relevant lines from a file read | Spam the entire 500-line file into the answer |
| Report what you found and what you did | Narrate your tool-calling process to the user |
| Use the tool output to inform your answer | Quote tool output verbatim without synthesis |

**The user cares about answers, not tool logs.**

---

## 10. Call Budget (Hard Limits)

| Constraint | Reason |
|---|---|
| Max 2 web searches per conversation turn | After 2, you're noise-searching |
| Max 1 retry per tool | If it fails twice, the approach is wrong |
| Max 3 reads before writing | Read too much, context fills with irrelevant data |
| Max 6 tool calls total per turn | The system's `maxSteps` — plan accordingly |
| Max 1 sub-agent delegation per turn | A sub-agent IS a tool call — use it once |

When you're approaching these limits, **stop and synthesize** what you already have.

---

## Quick Reference: Tool Selection Matrix

| Goal | Tool | Why |
|---|---|---|
| Check file contents | `read_file` | Direct, complete |
| Find files by name | `find_files` | Fast, pattern-based |
| Search file contents | `grep_files` | Regex search |
| Search code semantically | `code_search` | When regex won't work |
| List directory | `list_directory` | Structured output |
| Edit a file | `edit_file` | Targeted change |
| Write new file | `write_file` | Full content |
| Check git state | `git_status` | Before any git op |
| View git history | `git_log` | With `limit` param |
| Run a command | `run_command` | Last resort for non-standard tasks |
| Search web | `webSearch` | When you need fresh info |
| Fetch specific URL | `fetchPage` | Direct page access |
| Delegate complex task | `subagent_run` | 3+ sequential calls needed |
