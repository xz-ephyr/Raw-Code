# Content Creation Agent — Migration & Architecture Plan

> **Date:** 2026-07-12
> **Scope:** Pivot from coding assistant to AI content creation app (text + video)
> **Status:** Planning — awaiting implementation approval

---

## Validated User Intent

### Surface Intent
Build an AI content creation app that can write, edit text, generate video scripts, render video, and ask users questions — using a TypeScript tool-runtime + sub-agent system instead of the current Go agent backend.

### Latent Intent
- Two systems built **simultaneously** (tool calling + sub-agent) because they are interdependent
- Replace ad-hoc tool definitions with `Tool.make()` pattern (from dok-tor reference architecture)
- Use **Effect.ts** for async composition and dependency injection (same as dok-tor)
- Delete the entire Go `agent/` directory — no more Go binary, no more proxy calls
- Keep the frontend (React + Vite + AI SDK) largely intact
- Content tools should support: idempotency keys, partial results, version tracking, human-in-the-loop (question tool)

### Constraints
- `chatCompletion()` in `core/models/aiService.ts` must keep its return signature unchanged (frontend depends on it)
- Effect.ts is added via bridging (`Effect.runPromise`), NOT a full async/await → Effect rewrite
- Adapter layer between `Tool.make()` and Vercel AI SDK `streamText()` prevents SDK coupling

---

## Key Findings (Sub-Agent 1)

### Current Codebase State
| Aspect | Finding |
|--------|---------|
| Module structure | `core/` (control plane) + `src/` (React frontend) + `server/` (Express backend) + `agent/` (Go binary) |
| Tool pattern | Vercel AI SDK `tool()` with Zod, flat array in `allTools.ts`, most proxy to Go |
| Agent pattern | Plain TS interfaces (`Agent { id, label, toolScope, systemPrompt }`), static array |
| AI integration | `chatCompletion()` in `core/models/aiService.ts` returns `streamText()` result |
| Go agent | Full orchestrator, sub-agent manager, tool registry, agent loop, REST API at port 3002 |
| Server DB | SQLite with sessions, messages, projects, config, OAuth tokens — **no `parent_id` column** |
| Connectors | 11 OAuth connectors (gmail, github, youtube, telegram, reddit, twitter) — kept, rewired into tool-runtime |
| Effect.ts | **Not installed** |
| Frontend | Uses `useChat()` from `@ai-sdk/react` via `DefaultChatTransport` wrapping `chatCompletion()` |

### Dok-Tor Reference Patterns (from `migration/`)
- `Tool.make()` with WeakMap runtime — opaque tool value, runtime attached via WeakMap
- `settle()` — the only execution entry point; decodes, executes, encodes
- `withPermission()` — decorates tool with permission ruleset
- `ToolRegistry` — two tiers (global + session), materialize with permission filtering
- `AgentV2.Draft` / `AgentV2.Selection` — agent composition and spawn API
- `skill.ts` — sub-agent spawner tool; creates child session with `parentID`
- `PermissionV2.Ruleset` — per-agent tool access control
- Effect.ts for all async, DI via `Context.Tag` + `Layer`, validation via Effect Schema

---

## Professional Reasoning & Correct Approach (Sub-Agent 2)

### 1. Abstraction Layer
**Correct:** Adapter layer between `Tool.make()` (opaque, Effect-based) and Vercel AI SDK (plain async + Zod). The adapter calls `Effect.runPromise()` on `settle()` and converts JSON Schema to Zod schema.
**Rejected:** Making `Tool.make()` directly return a Vercel-compatible tool — couples to one SDK forever.

### 2. Effect.ts Integration
**Correct:** Bridge via `Effect.runPromise` at the outermost adapter layer. Tools internally use `Effect.gen*()`, the adapter resolves the Effect to a Promise. This keeps `aiService.ts` async/await compatible.
**Rejected:** Full Effect rewrite of `aiService.ts` — breaks frontend dependency chain.

### 3. Two-Tier Registry
**Correct:** Global (app-scoped tools like `web_search`) + Session (per-session tools like agent-specific tool sets). Sub-agents create a new session-scoped registry that overlays global.
**Rejected:** Flat array with `toolScope` string matching — no overlay semantics, no scope-based teardown.

### 4. Pure-TS Sub-Agents
**Correct:** Each sub-agent is an independent `streamText()` call with isolated tools, context, and system prompt. Runs in parallel for `tasks[]` input. Parent aborts propagate via `AbortSignal`.
**Rejected:** Recursive nesting inside parent's tool execute — blocks streaming.

### 5. Content Tool Design
- **Idempotency keys** on all write tools (prevent duplicate generation on retry)
- **Partial results** on research/long-running tools (return what you have, flag as partial)
- **Question tool** uses `Deferred` pattern: `ask()` → yield → UI receives event → user replies → `Deferred.succeed()` → resume
- **Video tools** return URIs not inline blobs, support async polling via `jobId`

### 6. Permission Model
Static roles (Writer, Editor, Researcher) with dynamic stage-gated overrides (draft → review → publish). Sub-agents never get `publish` or `delete`. Mode system: `primary | subagent | all`.

### 7. Risk Mitigation
| Risk | Mitigation |
|------|-----------|
| Effect.ts bundle size | Keep Effect only in packages, import dynamically in tool execution paths |
| Two-tier complexity in SPA | Simplify: global = static imports, session = runtime Map; no process persistence |
| Sub-agent abort propagation | Wire `AbortController` through spawn function to all child `streamText()` calls |
| Effect error opacity | Every `Effect.mapError` produces human-readable `ToolFailure`; adapter catches all and converts to plain Error |

---

## Precise Placement & Introduction Plan (Sub-Agent 3)

### New Package Structure

```
packages/tool-runtime/src/
├── index.ts                          — barrel
├── types.ts                          — ToolSchema, ToolExecuteContext, Content
├── tool/
│   ├── make.ts                       — Tool.make() with WeakMap runtime
│   ├── settle.ts                     — settle() dispatch
│   └── withPermission.ts             — Tool.withPermission decorator
├── registry/
│   ├── global.ts                     — GlobalRegistry (Context.Tag)
│   ├── session.ts                    — SessionRegistry (Context.Tag)
│   ├── materialize.ts                — Materialization { definitions, settle }
│   └── adapter.ts                    — toAISDKTools() bridge
├── content/
│   ├── write-article.ts              — write_article tool
│   ├── edit-text.ts                  — edit_text tool
│   ├── question.ts                   — question tool (deferred)
│   ├── research.ts                   — research tool
│   ├── generate-script.ts            — generate_script tool
│   └── index.ts
├── video/
│   ├── render-video.ts               — render_video tool
│   ├── export-video.ts               — export_video tool
│   ├── preview-video.ts              — preview_video tool
│   └── index.ts
└── builtins.ts                       — registerAll() composition

packages/subagent/src/
├── index.ts                          — barrel
├── types.ts                          — SubAgentRequest, SubAgentResult
├── subagent.ts                       — runSubAgent() single spawn
├── scheduler.ts                      — runParallel() multiple spawn
├── synthesizer.ts                    — merge results
└── bridge.ts                         — subagent_run Tool.make() implementation
```

### File-by-File Migration Order (8 Phases, ~45 steps)

**Phase 0 — Setup:** Create `package.json` + `tsconfig.json` for both packages, update root `tsconfig.json` with path aliases.

**Phase 1 — Core Tool Runtime:** Create `types.ts`, `tool/make.ts`, `tool/settle.ts`, `tool/withPermission.ts`, `registry/global.ts`, `registry/session.ts`, `registry/materialize.ts`, `registry/adapter.ts`.

**Phase 2 — Content Tools:** Create `write-article.ts`, `edit-text.ts`, `question.ts`, `research.ts`, `generate-script.ts`, `render-video.ts`, `export-video.ts`, `preview-video.ts`, all barrels, `builtins.ts`, `index.ts`.

**Phase 3 — Subagent Package:** Create `types.ts`, `subagent.ts`, `scheduler.ts`, `synthesizer.ts`, `bridge.ts`.

**Phase 4 — aiService.ts Rewrite:** Replace `buildTools()` with `toAISDKTools()` call. Connector tools are rewired via adapter (not removed).

**Phase 5 — Server Changes:** Add `parent_id` DB migration, create `content.ts` and `media.ts` routes. Connector routes stay.

**Phase 6 — Frontend:** Create `contentStore`, `pipelineStore`, `PipelineBuilder`, `VideoPreview`, `QuestionDialog`, `ArticleEditor` components; modify `ChatPage.tsx` transport.

**Phase 7 — Deletions:** `core/tools/agent/subagentRun.ts`, `core/utils/goProxy.ts`, `core/tools/allTools.ts`, code tools (`core/tools/code/*`, `core/tools/system/runCommand.ts`), entire `agent/` directory. Connector tools and writeArtifactTool stay.

**Phase 8 — Cleanup:** Type-check, lint, verify.

### What Gets Deleted
| Path | Reason |
|------|--------|
| `agent/` (entire ~50 files) | Go binary replaced by TS packages |
| `core/tools/code/*` (6 files) | Coding tools not needed for content |
(writeArtifactTool kept — rewired into tool-runtime via adapter)
| `core/tools/system/runCommand.ts` | Not needed for content |
| `core/utils/goProxy.ts` | Go agent deleted |
| `core/prompt/toolPolicy.ts`, `toolcallGuide.ts` | Code-focused prompts |

### What Gets Repurposed (Connectors)
| Component | Change |
|-----------|--------|
| `core/tools/gmail/`, `github/`, `youtube/`, `telegram/`, `reddit/`, `twitter/` | **Kept.** Rewired into tool-runtime via adapter — they become `Tool.make()` tools instead of raw Vercel SDK tools |
| `server/src/connectors/` (11 files) | **Kept.** The OAuth backend for connectors stays as-is |
| `server/src/routes/gmail.ts` | **Kept.** Routes stay — serve connector auth and actions |
| `server/src/routes/connector.ts` | **Kept.** Generic connector proxy stays |

### What Gets Repurposed
| Component | Change |
|-----------|--------|
| `core/models/aiService.ts` | Replace `buildTools()` with adapter, connectors go through same adapter |
| `core/tools/web/webSearchTool.ts` | Keep as-is, register via adapter |
| `server/src/db.ts` | Add `parent_id` column migration |
| `server/src/index.ts` | Add content/media routes alongside existing connector routes |
| `src/pages/ChatPage.tsx` | Replace transport, keep connector polling |
| `src/stores/` | Add contentStore, pipelineStore |
| Frontend components | Add content components alongside existing |

### What Stays Unchanged
| Component | Reason |
|-----------|--------|
| `core/providers/` | Model routing still needed |
| `core/memory/` | Context management still useful |
| `core/reasoning/` | Reasoning mode detection still needed |
| `src/stores/chatsStore.ts` | Chat state management unchanged |
| `src/hooks/` | Most hooks still usable |
| `src/types/` | Core chat types unchanged |
| `server/src/routes/sessions.ts` | Sessions still work, add `parent_id` param |
| `server/src/routes/messages.ts` | Messages unchanged |

---

## Impact Radius Map

### Critical Dependencies
| Change | Files Affected | Guard |
|--------|---------------|-------|
| Replace `allTools` with registry | `aiService.ts:394` → `ChatPage.tsx:168` | Feature flag `VITE_USE_NEW_TOOL_RUNTIME` |
| Rewire connectors via adapter | `core/tools/gmail/*`, `aiService.ts:buildTools()` | Wrap existing tools in Tool.make(); keep routes |
| `parentID` DB migration | `server/routes/sessions.ts`, `subagent/bridge.ts` | Nullable column, existing sessions OK |
| Adapter layer | `aiService.ts:buildTools()` → every tool | Unit test on `toAISDKTools` output |
| Sub-agent bridge | `core/tools/agent/subagentRun.ts` deleted | Falls back to `ToolFailure` if Effect throws |
| ChatPage transport | `ChatPage.tsx:146-188` | try/catch, fallback to error state |

### Top 3 Risks
1. **Effect.ts bundle size** — import in web context may bloat vendor chunk
2. **Two-tier registry in SPA** — no persistent process means registrations reset per page load
3. **Sub-agent abort propagation** — parent abort must cancel all child streams

---

## Recommendation

**Proceed with the plan.** The current codebase's Go agent is overengineered for a coding assistant and fundamentally misaligned with content creation. The two packages approach (`tool-runtime` + `subagent`) with Effect.ts and `Tool.make()` pattern is architecturally sound, well-referenced from the dok-tor migration docs, and provides a clean foundation for text + video content tools.

The 8-phase migration order minimizes risk: new packages are built before any existing code is deleted, the adapter keeps the frontend working throughout, and feature flags provide rollback capability.

---

**Next step:** Awaiting user permission to begin Phase 0 implementation.
