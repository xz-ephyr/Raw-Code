# AGENTS.md — Raw-Code

## Project Overview
AI content creation agent (text + video) built on Vite + React + Effect.ts.
Transforming from a coding-assistant app into a content-creation platform by
integrating the `@doktor/tool-runtime` and `@doktor/subagent` packages.

## Package Architecture

```
raw-code/
├── packages/
│   ├── tool-runtime/       @doktor/tool-runtime — Effect.ts tool system
│   │   ├── src/tool/        Tool.make(), toMaterializedTool(), settle()
│   │   ├── src/registry/    registerGlobal, materialize(), adapter → AI SDK
│   │   ├── src/content/     write-article, edit-text, research, generate-script, question
│   │   ├── src/video/       render-video, export-video, preview-video, poll-render-job
│   │   ├── src/plan/        create-plan, execute-plan, plan-store
│   │   ├── src/store.ts     ToolOutputStore — in-memory persistence layer
│   │   ├── src/events.ts    Event bus (emit/onEvent/onAnyEvent)
│   │   ├── src/event-store.ts  EventStore Tag/Layer (InMemoryEventStore)
│   │   ├── src/remote-event-store.ts  RemoteEventStore — sends events to server
│   │   └── src/deferred.ts  Deferred-based human-in-the-loop (register/resolve/await)
│   └── subagent/           @doktor/subagent — multi-agent orchestration
│       ├── src/subagent.ts  Core subagent loop: plan → tool calls → synthesize
│       ├── src/scheduler.ts runParallel, runSequential
│       ├── src/composer.ts  Pipeline composition (chain agents, template interpolation)
│       ├── src/bridge.ts    subagentRunTool + composeRunTool (registered globally)
│       ├── src/personalities.ts  5 agent types: general, explore, writer, researcher, video
│       └── src/synthesizer.ts    Result merging for parallel agents
├── core/
│   ├── tools/
│   │   ├── allTools.ts      Legacy tool array (cleaned, kept for existing tools)
│   │   ├── initToolRuntime.ts  Registers content/subagent tools globally on first use
│   │   └── system/runCommand.ts  Direct child_process (Go proxy deleted)
│   ├── models/aiService.ts  chatCompletion() — merges old allTools + new buildRuntimeTools()
│   └── providers/           Provider registry (kept as-is per migration plan)
├── server/
│   └── src/
│       ├── db.ts            SQLite via better-sqlite3, inline migrate()
│       ├── routes/events.ts /events/append, /events/append-batch, /events/:sessionId
│       └── index.ts         Express app, mounts event routes at /events
└── migration/               Design docs mapping raw-code → dok-tor patterns
    ├── a-tool-calling/      DONE (tool runtime integrated)
    ├── b-model-routes-providers/  NOT STARTED (VERY HIGH complexity)
    ├── c-subagent-spawning/       DONE (subagent integrated)
    ├── d-plan-mode/               DONE (plan tools implemented)
    ├── e-theme-system/            NOT STARTED
    ├── f-storage-database/        REF only (event_log table added)
    ├── g-llm-streaming/           NOT STARTED
    ├── h-git-diff-panel/          NOT STARTED
    ├── i-prompt-input-box/        NOT STARTED
    └── j-reasoning-summaries/     NOT STARTED
```

## Key Conventions

- **Effect.ts everywhere** in packages: tools return `Effect<Output, Error>`, tools use `Effect.gen(function* () { ... })`
- **Schema validation**: `Schema.Struct({...})` for input/output, `Schema.decodeUnknown()` in settle
- **No Zod** in packages — raw-code still uses Zod in `core/` and frontend
- **Idempotency**: all tools accept optional `idempotencyKey`; checked before execution
- **Session context**: `sessionID`, `agentID`, `assistantMessageID` threaded through via `ToolExecuteContext`
- **Versioning**: all content tools write to `version-store.ts` for revision tracking
- **Events**: tools emit lifecycle events via `emit()` — `tool_call_start/end`, `question_pending/answered`, `subagent_start/step/end`
- **Deferred pattern**: for human-in-the-loop (question tool, plan approval) — `registerDeferred()` + `yield* Deferred.await()`

## Important Files

| File | Purpose |
|------|---------|
| `packages/tool-runtime/src/tool/make.ts` | `make()`, `toMaterializedTool()`, idempotency check |
| `packages/tool-runtime/src/registry/adapter.ts` | `toAISDKTools()` — bridge Effect tools → Vercel AI SDK |
| `packages/tool-runtime/src/registry/materialize.ts` | `materialize()` — filter tools by source/scope |
| `packages/tool-runtime/src/store.ts` | `putToolOutput`, `getToolOutput`, idempotency index |
| `packages/tool-runtime/src/deferred.ts` | `registerDeferred`, `resolveDeferred`, `rejectDeferred` |
| `packages/subagent/src/bridge.ts` | `subagentRunTool`, `composeRunTool` — globally registered |
| `packages/subagent/src/composer.ts` | `compose()` — pipeline agent orchestration |
| `core/tools/initToolRuntime.ts` | Registers content + subagent tools on init |
| `core/models/aiService.ts` | Main chat loop, merges old + new tools |

## Migration Status (per migration/README.md)

| # | Subsystem | Status |
|---|-----------|--------|
| A | Tool Calling System | ✅ Done |
| B | Model Routes & Providers | ⬜ Not started |
| C | Subagent Spawning | ✅ Done |
| D | Plan Mode | ✅ Done |
| E | Storage/Database | ⬜ PARTIAL (event_log table, remote store) |
| F | Git Diff Panel | ⬜ Not started |

## Type Check Commands

- Main app: `npx tsc --noEmit` (from repo root)
- Server: `npx tsc --noEmit` (from server/)
