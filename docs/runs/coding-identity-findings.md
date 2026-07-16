# Coding-Agent Identity — All References

## 1. System Prompts (LLM-facing)

### `core/prompt/systemPrompt.ts`
| Lines | Content |
|-------|---------|
| 46–55 | **CONTENT TOOLS** block — lists `write_article`, `edit_text`, `research`, `generate_script`, `question` with descriptions (keep, not coding) |
| 57–63 | **Code changes workflow** — `read_file` → `edit_file` → `write_file` step-by-step |
| 65–83 | **Search methodology** — progressive narrowing, regex alternation, search budget, `search_codebase`/`grep`/`glob` |
| 85–99 | **Git workflow** + **Running commands** via `run_command` |
| 101–106 | When to delegate to sub-agent (keep) |

### `core/prompt/toolPolicy.ts` (entire file, 127 lines)
- **Lines 15–55**: `NEW_TASK_POLICY` — tool ratios (`grep: 45%`, `glob: 45%`, `read_file: 20%`, `edit_file: 15%`, `write_file: 15%`, `list_directory: 10%`, `run_command: 10%`), 4 phases (Explore → Read → Act → Verify)
- **Lines 57–90**: `CONTINUING_SESSION_POLICY` — similar, 3 phases (Orient → Act → Verify)
- **Lines 112–125**: **EXPLORER AGENT** section (project mode only)

### `core/prompt/toolcallGuide.ts` (entire file, 142 lines)
- **Lines 16–22**: Decision table about when to use tools (all code-focused)
- **Lines 26–36**: Explore/Plan/Act/Verify methodology
- **Lines 124–141**: Tool selection matrix listing `read_file`, `search_codebase`, `list_directory`, `edit_file`, `write_file`, `run_command`, `git_commit`, `git_branch`

### `core/prompt/system.md`
- **Line 1**: "You are a careful, methodical AI assistant."

### `core/memory/contextController.ts`
- **Lines 17–23**: When project context is present: "You are inside a folder... explore the codebase using `read_file`, `search_codebase`, `list_directory`. Always read files before editing them."

### `core/models/connectorPrompts.ts`
- **Lines 4–57**: Each connector tells the LLM "You have X connected. Use these tools when..." — Gmail, GitHub, YouTube, Telegram, Reddit, Twitter

---

## 2. Agent Definitions (to remove entirely)

| File | Agent | Core Identity |
|------|-------|---------------|
| `core/agents/explorer/index.ts` | Explorer | "You are Explorer — the default agent mode. Explore codebase. NEVER edit, write, or run commands. You are read-only." |
| `core/agents/debug/system-prompt.ts` | Bug Buster | "You are Bug Buster — a debugging orchestrator agent. Decompose debugging into 3 specialized sub-agents: Code Inspector, Log & Runtime Analyst, Test & Regression Verifier." |
| `core/agents/teamwork/system-prompt.ts` | Team Work | "You are Team Work — an orchestrator agent that coordinates team collaboration and process design." References `search_codebase`, `write_file`, `edit_file`. |
| `core/agents/explorer/tools.ts` | — | Tool descriptions: `read_file`, `search_codebase` |
| `core/agents/debug/tools.ts` | — | Tool descriptions: `read_file`, `search_codebase` |
| `core/agents/teamwork/tools.ts` | — | Tool descriptions: `search_codebase`, `write_file`, `edit_file` |
| `core/agents/types.ts` | — | `AgentTool` interface (`{ name, description }`), `Agent` interface |
| `core/agents/index.ts` | — | Registry: `[explorerAgent, debugAgent, teamworkAgent]`, `getAgentById()` |

---

## 3. Code Tools to Remove

| File | Tool / Function |
|------|----------------|
| `core/tools/system/runCommand.ts` | `run_command` — shell execution |
| ^ search codebase for `read_file` | file reading tool |
| ^ search codebase for `edit_file` | file editing tool |
| ^ search codebase for `write_file` | file writing tool |
| ^ search codebase for `search_codebase` | code search tool |
| ^ search codebase for `list_directory` | directory listing tool |
| ^ search codebase for `grep` / `glob` tool defs | text/glob search tools |

---

## 4. Subagent Personality Coding Reference

### `packages/subagent/src/personalities.ts`
- **Line 14**: General personality — "You are a capable general-purpose agent. You have access to a full suite of tools for research, writing, editing, and content creation." *(tool mention OK but generic)*
- **Line 24**: Explorer personality — "You are a read-only exploration agent. Your purpose is to gather information, **analyze code**, and answer questions." **"analyze code" must be removed**
- **Line 36**: Writer personality — OK (content-focused)
- **Line 48**: Researcher personality — OK (research-focused)
- **Line 60**: Video personality — OK (video production)
- **Line 76**: Fallback — OK (generic)

---

## 5. Frontend Coding References

| File | What |
|------|------|
| `src/components/chat/NTabDropdown.tsx` | Mode selector — references Explorer/Debug/Teamwork |
| `src/components/chat/UserBubble.tsx` | "Revert" button — connected to coding workflow |
| `src/stores/projectStore.ts` | `currentMode` state — currently maps to agent IDs |
| Various UI components | Agent-specific icons, labels, descriptions |

---

## 6. Infrastructure / Tool Assembly

### `core/tools/allTools.ts`
Array of legacy tools including connector tools + `webSearchTool` + `writeArtifactTool`. Merge with content tools in `aiService.ts`.

### `core/tools/initToolRuntime.ts`
Registers content, video, plan, and subagent tools globally. Keep as-is.

### `core/models/aiService.ts`
- **Line 150**: `buildToolPolicy(isNewSession ? 'new_task' : 'continuing_session')` — produces the coding-focused tool policy
- **Line 164**: Assembles `fullSystemPrompt` from system prompt + connector prompts + tool policy
- **Lines 249–251**: Merges `runtimeTools` + `legacyTools` for `streamText()`

### `core/tools/writeArtifactTool.ts`
Keep — produces markdown/Word/PPT/Excel/PDF for content deliverables.

---

## Summary

| Category | Count of Issues |
|----------|----------------|
| System prompt coding sections | 3 files (systemPrompt.ts, toolPolicy.ts, toolcallGuide.ts) |
| Agent definitions to delete | 3 agents (explorer, debug, teamwork) + types + registry |
| Code tools to remove | ~7 tools (run_command, read_file, edit_file, write_file, search_codebase, list_directory, grep/glob) |
| Subagent personality fix | 1 line ("analyze code") |
| Frontend to update | NTabDropdown, UserBubble, projectStore |
| Keep as-is | Connector tools, content/video/plan tools, write_artifact, web_search, subagent_run |
