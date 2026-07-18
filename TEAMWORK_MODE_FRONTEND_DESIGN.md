# Teamwork Agent Mode — Frontend Design Specification

> **Purpose**: This document describes the complete backend capabilities of the "Teamwork" agent mode so the frontend can be designed to expose every feature. It reflects the **actual implemented and tested** system (10/10 real-task suite passing against live Mistral `mistral-small-latest`).

---

## 1. High-Level Architecture

```
User Input (chat box)
       │
       ▼
┌──────────────────────────────────────────────┐
│  AI Service (core/models/aiService.ts)       │
│  • Merges legacy tools + new tool-runtime    │
│  • Builds Vercel AI SDK tool definitions     │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Tool Runtime Registry (@doktor/tool-runtime)│
│  • Global tools: subagent_run, compose_run   │
│  • Content tools: research, write_article,   │
│    edit_text, generate_script, crawl, etc.   │
│  • Session-scoped tools (connectors)         │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Subagent Orchestration (@doktor/subagent)   │
│  • Personalities: general, explore, writer,  │
│    researcher, video                         │
│  • Scheduler: runParallel (max 5 concurrent) │
│  • Composer: multi-step pipelines w/ {{...}} │
│  • Synthesizer: merges parallel results      │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  LLM Providers (@doktor/llm-providers)       │
│  • Routes: OpenAI, Anthropic, Google, Groq,  │
│    Mistral, Cerebras, Sambanova, etc.        │
│  • Tool loop with 429 retry + backoff        │
│  • Streaming (SSE) → text-delta events       │
└──────────────────────────────────────────────┘
```

**Key principle**: The frontend sends a *single* message; the backend decides whether to answer directly or delegate to `subagent_run` / `compose_run`. The UI should **not** hard-code mode switches — it just streams the assistant response.

---

## 2. Three Execution Modes (Exposed via Two Bridge Tools)

### 2.1 `subagent_run` — Single Task
```json
{
  "task": "string",                    // required
  "context": "string?",                // optional background
  "model": "string?",                  // override model ID
  "maxSteps": "number?",               // default from personality
  "agentType": "string?",              // general|explore|writer|researcher|video
  "toolScope": "string[]?"             // restrict tool names
}
```
**Returns**: `{ result: string, steps: number, mode: "single" }`

**Frontend UX**: Show as a single "Sub-agent thinking…" spinner, then stream the final answer.

---

### 2.2 `subagent_run` — Parallel Tasks (auto-detected)
```json
{
  "tasks": ["string", "string", ...],  // 2–N tasks
  "context": "string?",
  "model": "string?",
  "maxSteps": "number?",
  "agentType": "string?",
  "toolScope": "string[]?"
}
```
**Returns**: `{ result: string, steps: number, mode: "parallel" }`

**Synthesis**: Output is a merged block:
```
Combined results from 3 sub-tasks:

--- Sub-task 1 ---
The Apollo 11 moon landing occurred in 1969.

--- Sub-task 2 ---
The chemical symbol for gold is Au.

--- Sub-task 3 ---
William Shakespeare wrote the play Hamlet.
```

**Frontend UX**: Show a single "Running N sub-agents in parallel…" indicator with a counter (e.g., "2/3 completed"). Stream the merged result when done.

---

### 2.3 `compose_run` — Multi-Step Pipeline
```json
{
  "steps": [
    {
      "name": "string",                    // unique, used for {{name}}
      "agentType": "general|explore|writer|researcher|video",
      "taskTemplate": "string",            // {{__initial__}} or {{stepName}}
      "toolScope": "string[]?",
      "maxSteps": "number?"
    }
  ],
  "initialContext": "string?",
  "model": "string?"
}
```
**Returns**: `{ outputs: string[], stepCount: number }`

**Interpolation**: `{{__initial__}}` = `initialContext`; `{{stepName}}` = previous step's output.

**Frontend UX**: Render as a **visual pipeline**:
```
[Researcher: "List 3 benefits of {{__initial__}}"]
       │
       ▼ outputs "research"
[Writer: "Write a note using {{research}}"]
       │
       ▼ outputs "note"
```
Stream each step's output as it finishes; show step name, agent avatar, and partial text.

---

## 3. Agent Personalities (agentType)

| ID | Name | System Prompt Focus | Default Max Steps | Default Tool Scope |
|----|------|---------------------|-------------------|-------------------|
| `general` | General Purpose | Research, write, edit, create content, plan | 20 | All content + plan tools |
| `explore` | Research Agent | Gather info, analyze, **no content creation** | 10 | `question`, `research` |
| `writer` | Content Writer | Create articles, scripts, docs; research first | 10 | `write_article`, `edit_text`, `research`, `question` |
| `researcher` | Deep Research | Thorough investigation, summaries; **no final articles** | 12 | `research`, `research_compile`, `crawl_website`, `crawl_to_articles`, `map_site`, `extract_*`, `plan_*`, `create_plan`, `execute_plan` |
| `video` | Video Content | Research → script → render/preview/export | 10 | `generate_script`, `edit_video`, `render_video`, `preview_video`, `export_video`, `poll_render_job`, `research`, `question`, `import_video_sources`, `extract_videos` |

**Frontend**: Show personality as a colored badge/icon next to each step. Allow user to override `agentType` per step in compose mode.

---

## 4. Tool Scopes (toolScope)

Restrict which tools a sub-agent can call. Pass as array of tool names.

**Built-in tool names** (registered globally):
- `subagent_run`, `compose_run` (orchestration)
- `question`, `research`, `research_compile`
- `write_article`, `edit_text`, `generate_script`
- `scrape_url`, `extract_structured`, `extract_images`
- `crawl_website`, `crawl_to_articles`, `map_site`
- `plan_templates`, `create_plan`, `execute_plan`
- `render_video`, `export_video`, `preview_video`, `poll_render_job`
- `import_video_sources`, `extract_videos`
- Connector tools (YouTube, Gmail, Reddit, Twitter, Telegram) — session-scoped

**Default scopes** come from personality (see table above). Explicit `toolScope` overrides.

**Frontend**: In compose step editor, show a multi-select of available tools (filter by personality defaults).

---

## 5. Real-Time Event Stream (Server → Client)

The backend emits these event types via the existing event bus (WebSocket/SSE). Frontend should listen and render accordingly.

| Event | When | Payload |
|-------|------|---------|
| `subagent_start` | Sub-agent spawned | `{ sessionID, agentID, parentSessionID, task }` |
| `subagent_step` | Each tool-loop iteration | `{ sessionID, agentID, steps, toolCalls }` |
| `subagent_end` | Sub-agent finished | `{ sessionID, agentID, text, steps, toolCalls, usage }` |
| `tool_call_start` / `tool_call_end` | Individual tool invocations | `{ toolName, input, output?, error? }` |
| `question_pending` / `question_answered` | Human-in-the-loop question tool | `{ questionId, question, options? }` |
| `plan_created` / `plan_step_start` / `plan_step_end` / `plan_completed` | Plan execution | `{ planId, step, status }` |
| `video_render_start` / `video_render_progress` / `video_render_complete` | Video pipeline | `{ jobId, status, progress, outputUrl? }` |

**Streaming text**: The main assistant message streams `text-delta` chunks (Vercel AI SDK `streamText`). Sub-agent internal text is **not** streamed to the top-level message — only the final synthesized result appears in the chat. If you want to show sub-agent thinking, subscribe to `subagent_step` and render in a collapsible "thinking" panel.

---

## 6. Input Box Integration (How the User Triggers Teamwork)

**No special UI mode required**. The existing chat input box works:

1. User types: *"Research AI in healthcare, write a summary, and create a video script"*
2. `aiService.chatCompletion` receives message + all tools (including `subagent_run`, `compose_run`)
3. LLM decides:
   - Simple Q → answers directly
   - Complex multi-step → calls `compose_run` with steps
   - Parallelizable → calls `subagent_run` with `tasks: []`
   - Single deep task → calls `subagent_run` with `task: ""`
4. Tool executes → returns result → LLM incorporates into final answer
5. Final answer streams to chat

**Frontend implication**: Keep the input box exactly as-is. The "teamwork" behavior is **emergent** from the LLM's tool choice. You may add a small "⚡ Teamwork" badge on assistant messages that used sub-agents (detect via `tool_calls` in the message).

---

## 7. Configuration & Defaults (Frontend-Configurable)

| Setting | Backend Default | Frontend Control |
|---------|-----------------|------------------|
| Default model | `mistral-small-latest` (from `FRONTEND_MODELS[0]`) | Model selector dropdown |
| Max parallel sub-agents | 5 (hard-coded in scheduler) | Show as info; not user-adjustable |
| Max steps per sub-agent | Per personality (10–20) | Override per task/step |
| Tool scope | Per personality | Override per task/step |
| Rate-limit retry | 5 retries, 800ms base, 20s max | Transparent; show "Waiting for rate limit…" toast if >2 retries |

**Model list** (from `packages/llm-providers/src/providers/model-routes.ts`):
```ts
const FRONTEND_MODELS = [
  { id: 'gpt-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', provider: 'openai' },
  { id: 'claude-sonnet-4', provider: 'anthropic' },
  { id: 'gemini-2.5-flash', provider: 'google' },
  { id: 'llama-3.3-70b-versatile', provider: 'groq' },
  { id: 'mistral-small-latest', provider: 'mistral' },
  // … more
]
```
Fetch via `/api/models` or embed in build.

---

## 8. Error Handling & Edge Cases (Frontend Must Handle)

| Scenario | Backend Behavior | Frontend UX |
|----------|------------------|-------------|
| Rate limit (429) | Auto-retry up to 5× with backoff | Show transient "Rate limited, retrying…" toast; if all retries fail, show error in chat |
| Sub-agent tool error | Tool returns `{error}`; loop continues | Show ⚠️ on step; final answer may note "Tool X failed" |
| Sub-agent total failure | `runSubAgent` catches → returns `{ output: "[Step failed: …]", steps: 0 }` | Render failed step in red; pipeline continues |
| Compose step failure | `compose` catches → step output = error string | Show step as failed; later steps still run with error text as input |
| Go-crawl unavailable | `research` tool falls back to mock data silently | No UI change; answer quality may be lower |
| Abort (user cancels) | `AbortSignal` propagated to tool loop | Cancel button stops streaming; show "Stopped" |

---

## 9. Session & Context Threading

Every tool call receives `ToolExecuteContext`:
```ts
{
  sessionID: string,           // chat session ID
  agentID: string,             // "assistant" or sub-agent type
  assistantMessageID: string,  // message being generated
  toolCallID: string,          // unique per call
  resolveModel: (name) => any  // model override resolver
}
```

**Frontend**: Generate `sessionID` per chat thread (UUID). Pass `assistantMessageID` from the streaming message. The backend uses these for:
- Idempotency keys (prevent duplicate tool calls)
- Event emission (traceability)
- Version store (content revisions)

---

## 10. Version Store & Artifacts

Content tools (`write_article`, `edit_text`, `generate_script`, `render_video`, etc.) write to `version-store.ts` with:
```
sessionID/toolName/timestamp → { input, output, version }
```

**Frontend**: Show "History" sidebar for each artifact (article, script, video) with diff view. Use `GET /api/versions?sessionId=…&tool=write_article`.

---

## 11. Video Pipeline (Special UI)

When `agentType: "video"` or tools `render_video`/`preview_video`/`export_video` are used:

1. `generate_script` → script text (versioned)
2. `render_video` → returns `jobId`, status `queued`
3. `poll_render_job` → progress % → `completed` + `outputUrl`
4. `preview_video` → signed URL for inline player
4. `export_video` → final MP4 download / connector upload

**UI**: Dedicated "Video Project" panel with steps, preview player, and export buttons.

---

## 12. Connector Tools (Session-Scoped)

OAuth-connected tools (YouTube, Gmail, Reddit, Twitter, Telegram) are registered per-session after user connects. They appear in the tool list only for that session.

**Frontend**: "Connect Accounts" settings page → OAuth flow → tools auto-appear in LLM tool list for that session.

---

## 13. Testing & Verification (What the Backend Guarantees)

The **10-task real suite** (`npm run selftest -- --full --layer teamwork-real-tasks`) validates:

| Task | Mode | Asserts |
|------|------|---------|
| Capital of Australia | single | Contains "canberra", not "sydney"/"melbourne" |
| 17 × 24 | single | Exact "408" |
| Apollo 11 / Au / Hamlet | parallel | All three facts in merged output |
| Two large planets | parallel | Contains "jupiter" (accepts duplicate) |
| Walking health benefits | compose (explore→writer) | Contains health keywords, ≥40 chars |
| Renewable energy | compose (explore→writer) | Contains "solar", "wind" |
| Sentiment classification | single | Contains "positive" |
| Translate thank you | parallel | Contains "gracias", "merci" |
| Books chain | compose (writer→writer) | Contains "book", ≥20 chars |
| Squaring the circle | single | Contains "cannot"/"impossible" |

**Golden snapshots** stored in `tests/selftest/layers/teamwork-golden.json` — frontend can use these as **example outputs** for empty-state screens.

---

## 14. API Endpoints Frontend May Call Directly

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/models` | List available models with provider |
| `POST` | `/api/chat` | Main chat completion (streams) |
| `GET` | `/api/events/:sessionId` | SSE event stream for sub-agent steps |
| `GET` | `/api/versions` | Query version store |
| `POST` | `/api/connectors/:name/oauth` | Start OAuth flow |
| `GET` | `/api/connectors` | List connected accounts |

---

## 15. Frontend Implementation Checklist

- [ ] **Chat input** — unchanged; LLM chooses tools
- [ ] **Model selector** — dropdown from `/api/models`
- [ ] **Streaming message** — Vercel AI SDK `useChat` / `streamText`
- [ ] **Tool call badges** — show `subagent_run` / `compose_run` with icon
- [ ] **Parallel sub-agent indicator** — "Running N agents… (X/Y done)"
- [ ] **Compose pipeline view** — visual DAG with step outputs
- [ ] **Sub-agent thinking panel** (optional) — subscribe to `subagent_step` events
- [ ] **Artifact sidebar** — version history for articles/scripts/videos
- [ ] **Video project panel** — render progress, preview, export
- [ ] **Connector settings** — OAuth connect/disconnect
- [ ] **Error toasts** — rate limit, tool failure, abort
- [ ] **Empty state examples** — load from `teamwork-golden.json`

---

## 16. Files to Reference (Backend)

| File | Responsibility |
|------|----------------|
| `packages/subagent/src/bridge.ts` | `subagentRunTool`, `composeRunTool` definitions |
| `packages/subagent/src/subagent.ts` | `runSubAgent` core loop |
| `packages/subagent/src/scheduler.ts` | `runParallel` (concurrency 5) |
| `packages/subagent/src/composer.ts` | `compose` pipeline + interpolation |
| `packages/subagent/src/personalities.ts` | 5 agent types, prompts, scopes |
| `packages/subagent/src/synthesizer.ts` | Result merging |
| `packages/tool-runtime/src/registry/adapter.ts` | `toAISDKTools` → Vercel AI SDK format |
| `core/tools/initToolRuntime.ts` | Registers content + builtin tools |
| `core/models/aiService.ts` | Main chat loop, tool merging |
| `packages/llm-providers/src/adapters/tool-loop.ts` | Tool loop with 429 retry |
| `packages/llm-providers/src/route/transport/http.ts` | 429 → retryable error |
| `server/src/routes/events.ts` | SSE event stream endpoint |

---

## 17. Run the Suite Yourself

```bash
# Full run (needs API keys in server/data/doktor.db)
npm run selftest -- --full --layer teamwork-real-tasks

# Quick contract checks only (no network)
npm run selftest -- --layer subagent-orchestration
npm run selftest -- --layer mode-teamwork
```

---

**Last verified**: 2026-07-17 — 10/10 tasks passing against live Mistral `mistral-small-latest` with golden snapshots recorded. All code defects fixed and type-check clean.