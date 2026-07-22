# Priority Agenda — Raw-Code

> **How to use this file:** Items are grouped into priority tiers. Within each tier, pick the topmost unstarted item and execute it fully before moving to the next. Each item includes: what to find, how to fix, how to double-check, how to improve, and what assumptions to avoid.

---

## Legend

| Label | Meaning |
|-------|---------|
| `[PD]` | Partially Done — already started, needs finishing |
| `[NS]` | Not Started |
| `[BK]` | Blocked — depends on another item being done first |

---

## TIER 0 — FOUNDATION: Agent Framework, Harness & Sandbox

> Everything else depends on the agent framework being stable. Do these first, in order.

### 0.0 — Establish "Small Session" Rule [NS]

**What:** Cap each agent invocation to 1–2 focused changes. Prevents hallucination, breakage, and scope creep.

**Find:** Existing agent prompts, task dispatcher code, any orchestration loop.

**Fix:** Add a `maxChanges` or `scopeLimit` parameter to the task executor. Document the rule in AGENTS.md and the system prompt.

**Double-check:** Review 3 past agent runs — confirm they would have been split under the new rule.

**Improve:** Automate enforcement — if an agent proposes >2 changes, reject and ask for prioritization.

**Avoid:** Don't add a UI for this yet. Keep it in the orchestration layer.

---

### 1.0 — Simplify Agent Framework & Re-integrate Vercel AI SDK [PD]

**Items:** 1.1, 1.2, 1.3 from master list.

**What:** The current agent framework has integration issues, state management problems, and breaks on long sessions. Simplify the architecture and bring back Vercel AI SDK as the reliable core.

**Find:**
- Harness files: `harness.ts`, `agent-runner.ts`, `task-executor.*`
- Grep: `grep -r "horizon\|long-running\|session\|state" --include="*.ts"`
- Run the app with extended tasks, monitor logs/crashes.

**Fix:**
- Refactor to modular, **stateless** components where possible.
- Re-integrate Vercel AI SDK cleanly — follow the official integration guide, wrap your custom logic *around* it (not the other way around).
- Fix long-horizon sessions: add keep-alive, checkpoint/restore, abort-recovery.

**Double-check:**
- Unit + integration tests for 5–10+ turn conversations.
- Assert state persistence and model compliance across turns.
- Run 30+ turn stress test.

**Improve:**
- Add observability (logging, tracing per-turn).
- Make harness configurable per-model.
- Benchmark longer sessions for memory leaks.

**Avoid:**
- No new UI features.
- No new agent types yet.
- Stick to "simplify + stabilize."

---

### 1.1 — Insert Mistral, Groq, Cloudflare Models [NS]

**Item:** 1.4 from master list.

**What:** Add Mistral, Groq, and Cloudflare model support — all must comply with the simplified harness from 1.0.

**Find:** Current model provider files, adapter patterns, model list config.

**Fix:** Create an **adapter layer** that normalizes inputs/outputs to your harness contract. Each provider gets an adapter; the harness talks to the adapter, not the provider directly.

**Double-check:**
- Each model can complete a 10-turn conversation.
- Streaming, tool calls, and error handling work per-provider.

**Improve:** Provider health-check endpoint + automatic fallback.

**Avoid:**
- Don't fork the harness per-provider.
- Don't skip streaming support.

---

### 1.2 — Sandbox for Safe Command Execution [NS]

**Item:** 4.2 from master list.

**What:** Implement a safe sandbox for executing shell commands. Prevent unsafe actions, limit blast radius.

**Find:** `runCommand.ts`, any system command execution code, tool schemas for shell tools.

**Fix:**
- Use `vm2`, isolated Docker containers, or serverless functions with strict permissions.
- Whitelist allowed commands. Deny everything else.
- Add timeout, output size limit, filesystem access restrictions.

**Double-check:** Attempt disallowed actions (rm -rf, curl to internal network, etc.) — confirm they are blocked. Log every tool call.

**Improve:** Dynamic policy by agent role (general agent gets fewer permissions than admin).

**Avoid:**
- Don't build in production environment access.
- Don't allow arbitrary flag passthrough.

---

## TIER 1 — CORE FIXES: Prompt, ChatPage & Tool Calling

> After the framework is stable, fix the most visible user-facing issues.

### 2.0 — Update System Prompt with Strict Tool-Calling Scope [NS]

**Item:** 4.1 from master list.

**What:** Rewrite the system prompt so agents only call tools listed in their schema.

**Find:** Current system prompt definitions and tool schema registration.

**Fix:**
- Explicit scope statement: *"You may only call tools listed in this schema. Reject anything outside it."*
- Add tool-calling examples (positive + negative).
- Strip prompt bloat that accumulated over time.

**Double-check:** Send requests that attempt out-of-scope tool calls — confirm rejection.

**Improve:** Dynamic prompt versioning + A/B testing of prompt effectiveness. Log which prompt version was used per session.

**Avoid:**
- Don't embed secrets or internal paths in the prompt.
- Don't make the prompt so restrictive that legitimate tasks fail.

---

### 3.0 — ChatPage: Rename Route & Fix Persistent Bugs [✅]

**Items:** 3.1, 3.2 from master list.

**What:** Rename `/chat` route to `/hthread-page` (or similar). Fix response racing, tool call failures, and thread state corruption.

**Find:**
- Locate all files referencing old route (`chatpage`, `/chat`, etc.).
- Search for response handling, tool call logic, streaming code.
- Search for thread reordering bug (opened thread moves to top of list).

**Fix:**
- Rename route + update all links/navigation (hardcode nothing).
- Fix racing: use **request IDs**, **AbortController**, proper async queuing for tool calls.
- Ensure thread state is keyed by thread ID (not by position in array).
- Fix reordering: when opening a past thread, fetch it by ID and display in-place — don't mutate the list order.

**Double-check:**
- E2E test: send message → tool call → response → new message.
- Monitor network tab for duplicate/cancelled calls.
- Open 3 different threads, verify each keeps its position in the list.

**Improve:** Add optimistic updates + proper error boundaries per-thread.

**Avoid:**
- Don't touch unrelated routing.
- Don't rewrite the entire chat UI — targeted fixes only.

---

## TIER 2 — UI QUALITY: Bugs, Consistency & Data Sync

> After core functionality is solid, polish the UI.

### 4.0 — UI Bug Hunt & Consolidation [✅]

**Items:** 2.1, 2.2 from master list.

**What:** Rabbit-hole debug UI bugs: inconsistent design, duplicate components, UI racing conditions. Fix agent/sub-agent UIs that connect to live data.

**Find:**
- Browser DevTools: console errors, React warnings, duplicate component mounts (React DevTools).
- Visual regression: compare screenshots across pages.
- Search for duplicated component files or similar class/component names.
- Grep for stale data patterns: `useEffect` without cleanup, missing keys, race-prone async.

**Fix:**
- Consolidate duplicates into single reusable components with props.
- Fix racing: proper keys, `useEffect` cleanup, consider Zustand or Jotai if React state isn't enough.
- Enforce consistent design tokens (Tailwind config or CSS vars).
- Add loading/error/empty states to all live-data components.

**Double-check:**
- Run full UI test suite + manual checklist on all agent/subagent pages.
- Test live data connections with mocked backend (confirm loading → data → error flows).

**Improve:** Component library + Storybook for isolated testing.

**Avoid:** Don't redesign unrelated pages. No full visual overhaul.

---

## TIER 3 — FEATURE PRODUCTION (small, controlled)

> After stability and polish, introduce new capabilities one at a time.

### 5.0 — Document Agent Framework Pros/Cons [NS]

**Item:** 5.1 from master list.

**What:** Document strengths and weaknesses of the current agent framework. This guides all future simplification decisions.

**Find:** The framework codebase (adapter, harness, tool registries).

**Fix:** Write a `docs/agent-framework-audit.md` with:
- Strengths (what works well, what to preserve).
- Weaknesses (pain points, failure modes, complexity hotspots).
- Recommendations for each weakness.

**Double-check:** Have another developer or an LLM review the document for accuracy.

**Improve:** Turn recommendations into actionable tickets.

**Avoid:** Don't implement any recommendations in this item — document only.

---

### 5.1 — Add To-Do Tool to All Agents [NS]

**What:** Add a `create_todo` / `update_todo` / `complete_todo` tool to the harness so agents can plan and track tasks.

**Find:** Current tool registration, tool schema patterns.

**Fix:** Implement todo tool with CRUD operations, store in-memory or in ToolOutputStore. Register globally.

**Double-check:** Agent creates a plan, marks items complete, reads back the plan.

**Improve:** Persist todos across sessions, sync with external todo service.

**Avoid:** Don't build a full project management UI — tool calls only.

---

## APPENDIX: Quick-Reference by File Pattern

| What | Search Pattern |
|------|---------------|
| Harness / agent runner | `harness.ts`, `agent-runner.ts`, `task-executor.*` |
| Tool registration | `allTools.ts`, `initToolRuntime.ts` |
| System prompt | `system-prompt*`, `DEFAULT-MODE.md` |
| Chat page / thread | `chatpage*`, `chat/*`, `thread*` |
| Route definitions | `router*`, `routes*`, `navigation*` |
| Sandbox / command exec | `runCommand.ts`, `sandbox*` |
| UI components (agent) | `components/agent*`, `components/subagent*` |
| Model providers | `providers/*`, `aiService.ts` |
| Design tokens | `tailwind.config.*`, `globals.css` |
