# Complete Request Flow: User Message → AI Response

> Documenting every component that touches a request from **user sends message** to **AI response renders** in the Raw-Code application.

---

## Overview

The application uses **two parallel streaming paths** that share identical core logic:

| Path | Entry Point | Tool Execution Location |
|------|-------------|------------------------|
| **Client-side** | `nativeChatCompletion()` in browser | `mat.settle()` runs tools in browser (Effect) |
| **Server-side** | `POST /llm/stream` in Express | `mat.settle()` runs tools on server |

Both use the same `createToolLoop` + `materialize().settle()` — only the **executor location** differs.

---

## 1. Frontend Entry Points

### `src/components/chat/ChatInput.tsx`
- User types message → `onSubmit` handler
- Calls `handleSend(content)` from `useChatPage` hook

### `src/hooks/useChatPage.ts:229`
```typescript
ChatStreamService.start({
  sessionId: uuid!,
  messages,
  modelName: currentModel,        // from getModelForChatRequest() → localStorage
  modeId: currentMode,            // persona: 'general', 'writer', 'researcher', etc.
  projectContext: undefined,
  connectedConnectors: [],        // populated from connector status
  isWebSearchEnabled: boolean,
  isThinkingEnabled: boolean,
}, {
  onMessage: (msg, isPartial) => { /* update UI */ },
  onFinish: (msg) => { /* persist, generate title */ },
  onError: (err) => { /* toast error */ },
})
```

---

## 2. Stream Orchestration (Frontend)

### `src/services/ChatStreamService.ts:150` — `start(config, callbacks)`
- Creates `AbortController`, stream state
- Calls `runNativeStream` (or legacy `runAISDKStream`)

### `src/services/ChatStreamService.ts:77` — `runNativeStream()`
```typescript
const eventStreamPromise = nativeChatCompletion({
  messages: config.messages,
  modelName: config.modelName,
  modeId: config.modeId,
  projectId: config.sessionId,
  projectContext: config.projectContext,
  connectedConnectors: config.connectedConnectors,
  abortSignal: controller.signal,
})

const eventStream = await eventStreamPromise

await Effect.runPromise(
  Stream.runForEach(eventStream, (event) =>
    Effect.sync(() => {
      const next = reduceEvent(state.llmState, event)
      state.llmState = next
      // Emit partial/complete messages via callbacks
    })
  )
)
```

### `src/lib/llmEventReducer.ts:51` — `reduceEvent(state, event)`
Pure reducer: `LLMEvent[] → StreamState`
- Handles: `text-delta`, `reasoning-delta`, `tool-call`, `tool-result`, `finish`, `provider-error`
- Maintains: `messages[]`, `currentMessage`, `status`, `error`

---

## 3. Native Chat Completion (Core)

### `core/models/nativeChatCompletion.ts:58` — `nativeChatCompletion(input)`
```typescript
export async function nativeChatCompletion(input: NativeChatInput): Promise<Stream.Stream<LLMEvent, Error>> {
  const route = selectRoute(input.modelName)           // → proxy route
  const model = route.model({ id: route.id })          // LLM.Model with route ID
  
  const apiKey = await getApiKey(input.projectId)      // providerCache + localStorage fallback
  
  const systemPrompt = await buildNativeSystemPrompt({ // persona + memory + connectors + policy
    modeId: input.modeId,
    projectId: input.projectId,
    projectContext: input.projectContext,
    connectedConnectors: input.connectedConnectors,
  })

  const mat = materialize()                            // Collect all registered tools
  const toolDefs = mat.definitions.map(d => makeToolDefinition(d))

  const request = new LLMRequest({
    model,
    system: [SystemPart.make(systemPrompt)],
    messages: convertMessages(input.messages),
    tools: toolDefs,
    toolChoice: makeToolChoice("auto"),
    http: { headers: { authorization: `Bearer ${apiKey}` } },
  })

  const loop = createToolLoop({ routes: [route], abortSignal: input.abortSignal })

  const executor: ToolExecutor = (call) =>
    Effect.tryPromise({
      try: () => mat.settle(call, context),
      catch: (err) => new Error(String(err)),
    }).pipe(Effect.flatMap(...))

  return loop(request, executor)
}
```

### `core/tools/nativeRoutes.ts` — Proxy Route Definitions
```typescript
const PROXY_BASE = "/proxy/https://api.openai.com/v1"

export const proxyGpt4o = gpt4o.with({
  endpoint: { baseURL: PROXY_BASE },
  auth: Auth.none,
})
// Also: proxyGpt4oMini, proxyO3, proxyO4Mini
```

### `core/models/nativeSystemPrompt.ts` — `buildNativeSystemPrompt()`
Constructs full system prompt from:
- Base `SYSTEM_PROMPT`
- Persona-specific prompt (`modeId`)
- Project memory (`projectMemory`)
- Connector status prompts
- Tool policy
- Response style (concise/balanced/detailed)
- Custom instructions (`localStorage.ai_rules`)

### `core/models/providerCache.ts` — `getProviders(projectId)`
- Reads API keys from SQLite (`DatabaseService.getConfig`) + localStorage fallback
- Creates provider clients via `providerRegistry.getProviderClient()`
- Caches per project with 5s TTL

### `packages/tool-runtime/src/registry/global.ts` — `materialize()`
Collects all tools registered via `registerGlobal()` and `registerContentTools()`:
- **Source: `content`** — `write_article`, `edit_text`, `research`, `question`, `generate_script`, `crawl_website`, `map_site`, `extract_videos`, `scrape_url`, `extract_images`, `extract_structured`, `research_compile`, `crawl_to_articles`, `import_video_sources`, `render_video`, `edit_video`, `export_video`, `preview_video`, `poll_render_job`
- **Source: `builtin`** — `create_plan`, `execute_plan`, `plan_templates`, `subagent_run`, `compose_run`

---

## 4. Tool Loop (llm-providers Package)

### `packages/llm-providers/src/adapters/tool-loop.ts:45` — `createToolLoop()`
```typescript
export function createToolLoop(config: ToolLoopConfig) {
  return (request: LLMRequest, executor: ToolExecutor) =>
    Stream.unwrap(loop(request, executor, 0).pipe(Effect.provide(llmClientLayer(config.routes))))
}

const loop = (request, executor, step) => Effect.gen(function* () {
  const client = yield* LLMClient
  
  // Stream from provider (with abort support)
  const rawStream = signal
    ? client.stream(request).pipe(Stream.interruptWhen(makeAbortEffect(signal)))
    : client.stream(request)
  
  // Collect all events from this step
  const chunk = yield* Stream.runCollect(rawStream.pipe(...))
  
  // Extract tool calls
  const toolCalls = chunk.filter(e => e.type === "tool-call")
  
  if (toolCalls.length === 0) return Stream.fromIterable(chunk)
  
  // Execute all tool calls in parallel
  const toolResults = yield* Effect.forEach(toolCalls, (tc) =>
    executor({ id: tc.id, name: tc.name, input: tc.input }).pipe(...)
  )
  
  // Build next request with assistant + tool messages
  const nextRequest = updateLLMRequest(request, { messages: [...request.messages, assistantMsg, ...toolResultMsgs] })
  
  // Recurse
  const rest = yield* loop(nextRequest, executor, step + 1)
  
  return Stream.fromIterable([...events, ...toolResults]).pipe(Stream.concat(rest))
})
```

### `packages/llm-providers/src/route/client.ts` — LLMClient Layer
- **`layer(routes)`** — Creates `Effect.Layer` providing `LLMClient` service
- **HTTP Runtime** — `fetch(url, { method: 'POST', headers, body })`
- **`prepareRequest()`** — Finds route by `model.route.id` (string), builds body, prepares transport
- **`streamPrepared()`** — Routes to correct transport based on `PreparedRequest.protocol`

---

## 5. Tool Execution (Client-Side)

### `core/models/nativeChatCompletion.ts:97` — Executor
```typescript
const executor: ToolExecutor = (call) =>
  Effect.tryPromise({
    try: () => mat.settle(
      { id: call.id, name: call.name, input: call.input },
      { sessionID: input.projectId ?? "", agentID: "main", assistantMessageID: "", toolCallID: call.id },
    ),
  }).pipe(Effect.flatMap(...))
```

### Tool Runtime Implementation
| File | Purpose |
|------|---------|
| `packages/tool-runtime/src/tool/make.ts` | `Tool.make()` — defines Effect-based tools with `settle()` |
| `packages/tool-runtime/src/content/*.ts` | Content tools (20+) |
| `packages/tool-runtime/src/plan/*.ts` | Plan tools: `create_plan`, `execute_plan`, `plan_templates` |
| `packages/tool-runtime/src/video/*.ts` | Video tools: `render_video`, `export_video`, `preview_video`, `poll_render_job` |
| `packages/subagent/src/bridge.ts` | `subagent_run`, `compose_run` — registered as `builtin` |

---

## 6. Server-Side Proxy & Streaming

### `vite.config.ts:34` — Dev Proxy
```typescript
server: {
  proxy: {
    '/proxy': { target: 'http://localhost:3001', changeOrigin: true }
  }
}
```

### `server/src/routes/proxy.ts:8` — `/proxy/*` Handler
```typescript
router.all('/proxy/*', async (req, res) => {
  const actualUrl = req.path.replace(/^\/proxy\//, '')  // "https://api.openai.com/v1/chat/completions"
  const response = await fetch(actualUrl, {
    method: req.method,
    headers: { ...req.headers, 'accept-encoding': 'identity' },
    body: JSON.stringify(req.body),
  })
  // Stream response back to client
})
```

### `server/src/routes/llm-stream.ts:59` — `POST /llm/stream`
```typescript
router.post('/stream', (req, res) => {
  const { messages, model, systemPrompt } = req.body
  const route = selectRoute(model ?? 'auto')
  const mat = materialize()
  
  const request = new LLMRequest({
    model: route.model({ id: route.id }),
    system: [SystemPart.make(systemPrompt ?? '')],
    messages: convertMessages(messages),
    tools: toolDefs,
    http: { headers: { 'Content-Type': 'application/json' } },
  })
  
  const loop = createToolLoop({ routes: [route] })
  const executor = (call) => mat.settle(call, { agentID: 'server', ... })
  
  const eventStream = loop(request, executor)
  
  // SSE streaming to client
  Effect.runPromise(Stream.runForEach(eventStream, (event) => writeSSE(res, event.type, event)))
})
```

### `server/src/index.ts`
- `registerContentTools('content')` at startup (line 121)
- Mounts `/llm` routes (line 115)

---

## 7. LLM Providers Core (HTTP Layer)

### `packages/llm-providers/src/route/transport/http.ts` — `HttpTransport`
```typescript
prepare: (prepareInput) => Effect.gen(function* () {
  const url = renderEndpoint(prepareInput.endpoint, { request, body }).toString()
  const bodyText = prepareInput.encodeBody(prepareInput.body)
  const headers = yield* Auth.toEffect(prepareInput.auth)({ ... })
  return { url, bodyText, headers, framing: input.framing }
})

frames: (prepared, _request, runtime) => {
  const res = yield* runtime.http.execute(prepared.url, prepared.bodyText, prepared.headers)
  // Parse SSE frames via Framing
}
```

### `packages/llm-providers/src/route/endpoint.ts` — URL Rendering
```typescript
export const render = <Body>(endpoint: Endpoint<Body>, input: EndpointInput<Body>) => {
  const base = (endpoint.baseURL ?? "").replace(/\/+$/, "")
  const path = renderPart(endpoint.path, input)

  // Handle relative proxy paths: "/proxy/https://api.openai.com/v1"
  if (base.startsWith("/")) {
    return base + path
  }

  const url = new URL(`${base}${path}`)
  for (const [key, value] of Object.entries(endpoint.query ?? {})) {
    url.searchParams.set(key, value)
  }
  return url
}
```

### `packages/llm-providers/src/protocols/openai-chat.ts`
- Maps `LLMRequest` → OpenAI Chat Completions request body
- Maps OpenAI SSE response → `LLMEvent` stream

### `packages/llm-providers/src/route/framing.ts` — `Framing.sse`
- Parses SSE stream: `data: {...}\n\n` → `LLMEvent` objects

---

## 8. Provider Registry (API Key Resolution)

### `core/providers/providerRegistry.ts`
**Still uses AI SDK** for provider client creation (not streaming):
```typescript
import { createOpenAI } from '@ai-sdk/openai'

createClient: (apiKey, baseURL) => createOpenAI({ apiKey, baseURL }).chat
```

### `core/models/providerCache.ts`
- Caches provider clients per project
- Reads keys from DB → localStorage fallback
- Returns `Map<providerId, ProviderClient>`

---

## 9. Event Bus & Persistence

| File | Purpose |
|------|---------|
| `packages/tool-runtime/src/events.ts` | `emit/onEvent` — tool lifecycle: `tool_call_start`, `tool_call_end`, `question_pending`, `question_answered`, `subagent_start`, `subagent_step`, `subagent_end` |
| `packages/tool-runtime/src/event-store.ts` | `EventStore` Tag/Layer (InMemory + Remote) |
| `packages/tool-runtime/src/remote-event-store.ts` | `RemoteEventStore` — POSTs events to `/events/append` |
| `packages/tool-runtime/src/store.ts` | `ToolOutputStore` — idempotency key → output mapping |
| `packages/tool-runtime/src/deferred.ts` | Human-in-the-loop: `registerDeferred`, `resolveDeferred`, `awaitDeferred` |
| `src/services/ChatStreamService.ts:55` | `persistMessage()` → `DatabaseService.saveMessages()` |
| `server/src/db.ts` | SQLite schema: `messages`, `sessions`, `event_log`, `projects`, `config` |

---

## 10. UI Rendering

| File | Purpose |
|------|---------|
| `src/components/chat/MessageList.tsx` | Renders `messages` array; subscribes to `ChatStreamService` |
| `src/components/chat/AssistantBubble.tsx` | Streams partial content via `isPartial` flag |
| `src/components/chat/MarkdownMessage.tsx` | Markdown + reasoning blocks + tool call rendering |
| `src/components/chat/CodeBlock.tsx` | Syntax-highlighted code blocks |
| `src/components/sidebar/Sidebar.tsx` | Shows streaming indicator: `ChatStreamService.isStreaming(sessionId)` |
| `src/components/chat/ChatMessageRow.tsx` | Message wrapper with actions (copy, regenerate) |

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER TYPES IN ChatInput.tsx                                                 │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ handleSend(content)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ useChatPage.ts:229  ChatStreamService.start(config, callbacks)              │
│   - sessionId, messages, modelName, modeId, projectContext                  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ChatStreamService.ts:77  runNativeStream()                                  │
│   - Creates AbortController                                                 │
│   - Calls nativeChatCompletion()                                            │
│   - Pipes events through llmEventReducer                                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ core/models/nativeChatCompletion.ts:58  nativeChatCompletion()              │
│   1. selectRoute(modelName) → proxyGpt4o/gpt4oMini/o3/o4Mini               │
│   2. getApiKey() → providerCache + localStorage                            │
│   3. buildNativeSystemPrompt() → persona + memory + connectors + policy    │
│   4. materialize() → all registered tool definitions                       │
│   5. LLMRequest { model, system, messages, tools, toolChoice, http }       │
│   6. createToolLoop({ routes: [route], abortSignal })                      │
│   7. executor = (call) => mat.settle(call, context)                        │
│   8. Returns Stream<LLMEvent, Error>                                       │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ packages/llm-providers/src/adapters/tool-loop.ts  createToolLoop()          │
│   Loop:                                                                     │
│   1. LLMClient.stream(request)                                              │
│   2. Collect events (text-delta, tool-call, etc.)                          │
│   3. If tool-calls: execute via executor(mat.settle) in parallel           │
│   4. Build next request with assistant + tool messages                     │
│   5. Recurse until maxSteps or no tool calls                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
         ┌─────────────────────┐     ┌─────────────────────┐
         │ CLIENT-SIDE EXECUTOR │     │ SERVER-SIDE EXECUTOR │
         │ mat.settle() in      │     │ mat.settle() in      │
         │ browser (Effect)     │     │ Express (Effect)     │
         └──────────┬──────────┘     └──────────┬──────────┘
                    │                           │
                    ▼                           ▼
         ┌─────────────────────┐     ┌─────────────────────┐
         │ Tool Runtime:       │     │ Tool Runtime:       │
         │ - write_article     │     │ - write_article     │
         │ - research          │     │ - research          │
         │ - subagent_run      │     │ - subagent_run      │
         │ - etc.              │     │ - etc.              │
         └──────────┬──────────┘     └──────────┬──────────┘
                    │                           │
                    ▼                           ▼
         ┌─────────────────────┐     ┌─────────────────────┐
         │ LLMClient.stream()  │     │ HTTP → Server       │
         │   │                 │     │   │                 │
         │   ▼                 │     │   ▼                 │
         │ HTTP → /proxy/*     │     │ /llm/stream POST    │
         │   │                 │     │   │                 │
         │   ▼                 │     │   ▼                 │
         │ Vite proxy          │     │ Express proxy.ts    │
         │   │                 │     │   │                 │
         │   ▼                 │     │   ▼                 │
         │ localhost:3001      │     │ localhost:3001      │
         │   │                 │     │   │                 │
         │   ▼                 │     │   ▼                 │
         │ proxy.ts → OpenAI   │     │ proxy.ts → OpenAI   │
         └─────────────────────┘     └─────────────────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ OpenAI API              │
                    │ Returns SSE stream      │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ Framing.sse parses      │
                    │ SSE → LLMEvent[]        │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ ToolLoop collects       │
                    │ events, executes tools, │
                    │ recurses                │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ llmEventReducer         │
                    │ StreamState {           │
                    │   messages,             │
                    │   currentMessage,       │
                    │   status,               │
                    │   error                 │
                    │ }                       │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ callbacks.onMessage()   │
                    │ → useChatPage.setMessages│
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ MessageList →           │
                    │ AssistantBubble →       │
                    │ MarkdownMessage         │
                    └─────────────────────────┘
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite dev server, proxy `/proxy` → `localhost:3001`, path aliases |
| `server/tsconfig.json` | `@doktor/*` path mappings, `ESNext`, `bundler` resolution |
| `tsconfig.json` | Root TypeScript config, path aliases for `@core`, `@doktor/*` |
| `core/config/models.ts` | Model definitions (100+ models across 15 providers) |

---

## Key Environment Variables

| Variable | Used By |
|----------|---------|
| `VITE_FEATURE_NATIVE_LLM` | `ChatStreamService.ts:9` — enables native path (default: `true`) |
| `OPENAI_API_KEY` | `providerCache` fallback, `providerRegistry` |
| `ANTHROPIC_API_KEY` | `providerRegistry` |
| `GOOGLE_API_KEY` | `providerRegistry` |
| `PORT` | Server port (default: 3001) |

---

## Database Tables (SQLite)

| Table | Purpose |
|-------|---------|
| `sessions` | Chat sessions: id, title, createdAt, updatedAt, streaming, projectId |
| `messages` | Messages: id, sessionId, role, content, parts, model, createdAt |
| `event_log` | Tool/subagent events: sessionId, agentId, type, payload, timestamp |
| `projects` | Project context: id, name, context, createdAt |
| `config` | Key-value: api keys, base URLs, search provider, etc. |
| `memory` | Project memory: projectId, key, value, source, updatedAt |

---

## Migration Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: AI SDK Adapter | ✅ | `toLLMEvents()` in `llm-providers/adapters/from-ai-sdk.ts` |
| Phase 1: Browser Streaming | ✅ | `useLLMEventStream`, `llmEventReducer`, `ChatStreamService` |
| Phase 2a: Native Completion | ✅ | `nativeChatCompletion`, `nativeSystemPrompt`, `nativeRoutes` |
| Phase 2b: Server Tool Loop | ✅ | `server/routes/llm-stream.ts`, `server/tsconfig.json` |
| Phase 3: Replace Generators | ✅ | `sessionTitle.ts`, `contextContractor.ts` rewritten |
| Phase 4: AI SDK Cleanup | ✅ | Removed `ai`, `@ai-sdk/*` deps; deleted legacy tools |
| Provider Registry | ⚠️ | Still uses `@ai-sdk/openai` for client creation |
| Subagent Streaming | ⚠️ | Still uses `streamText` from AI SDK |
| Connector Tools | ⚠️ | Need Effect.ts versions for native path |

---

## Entry Points Summary

| Scenario | Entry Point |
|----------|-------------|
| User sends message in chat | `ChatInput.tsx` → `useChatPage.handleSend` |
| Resume abandoned stream | `useChatPage.ts:292` → `sessionStorage['pending-first-message']` |
| Subagent execution | `packages/subagent/src/bridge.ts` → `subagentRunTool` |
| Server-side streaming | `POST /llm/stream` → `server/routes/llm-stream.ts` |
| Title generation | `core/models/sessionTitle.ts` → `generateSessionTitle()` |
| Context contraction | `core/memory/contextContractor.ts` → `contractContext()` |

---

*Generated from codebase analysis — Raw-Code v0.15.0*