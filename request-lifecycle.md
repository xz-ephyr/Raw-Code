# Request-Response Lifecycle

Complete trace of a chat message from user input to AI response rendering.

## Overview

```
ChatInput → useChatPage.handleSend → ChatStreamService.start
  → nativeChatCompletion → createToolLoop → LLMClient (Route) → HTTP Transport
  → Server Proxy → OpenAI API
  ← SSE stream ← Server Proxy ← LLM Client
  → tool-loop (Tool Executor → materialize.settle → Tool.make.execute)
  → LLMEvent stream → llmEventReducer → ChatStreamService callbacks
  → React setState → MessageList re-render → ChatMessageRow
  → DatabaseService.saveMessages → Server /save_messages → SQLite
```

---

## 1. UI Trigger

**File:** `src/components/chat/ChatInput.tsx`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 97-101 | `handleKeyDown()` | Enter key (without Shift, when `enter_to_send` is true) → `handleSend()` |
| 83-93 | `handleSend()` | Calls `onSend(text)` prop, clears editor, resets height |
| 141-150 | Render | `contentEditable` div with handler wiring |

**Connection:** `onSend` prop flows from `MessageList` → `useChatPage.handleSend`

---

## 2. Orchestration

**File:** `src/hooks/useChatPage.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 194 | `handleSend()` | Central send handler |
| 203-209 | Create user message | Builds `UIMessage` with `id: crypto.randomUUID()`, `role: 'user'`, `content`, `parts` |
| 212 | Save to DB | `DatabaseService.saveMessages(uuid, [userMsg])` |
| 217 | Optimistic update | `setMessages(prev => [...prev, userMsg])` |
| 225-227 | Title generation | `maybeGenerateTitle()` on first message → `generateSessionTitle()` → `ChatSessionManager.rename()` |
| 229 | Start stream | `ChatStreamService.start({ sessionId, messages, modelName, ... }, { onMessage, onFinish, onError })` |
| 239-248 | `onMessage` | `setMessages` to update/replace message in state; sets `status` to `'streaming'` or `'idle'` |
| 255-272 | `onFinish` | `setStatus('idle')`, records duration, adds files, saves assistant msg to DB |
| 274-280 | `onError` | `getAIErrorMessage(err)`, toast, `setStreamError`, `setStatus('error')` |
| 284-289 | `stop()` | `ChatStreamService.stop(uuid)`, sets status to `'idle'` |

---

## 3. Stream Manager

**File:** `src/services/ChatStreamService.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 150 | `ChatStreamService.start()` | Entry point |
| 158-167 | Setup | Creates `AbortController`, initializes `StreamState` with `createEmptyState()`, stores in `activeStreams` Map |
| 170-173 | DB streaming flag | `ChatSessionManager.setStreaming(id, true)` |
| 175-186 | Select and run | Selects `runNativeStream` (default) or `runAISDKStream`; wraps callbacks to call `_clearStreaming` on finish/error |
| 77 | `runNativeStream()` | Core streaming executor |
| 82-90 | Call native chat | `nativeChatCompletion(input)` → returns `Stream<LLMEvent, Error>` |
| 94-122 | Effect loop | `Effect.runPromise(Stream.runForEach(eventStream, ...))` |
| 101 | Reduce event | `reduceEvent(state.llmState, event)` builds assistant message state |
| 104-108 | Partial message | `persistMessage()` to DB + `onMessage(uiMsg, true)` for real-time UI |
| 111-119 | Complete message | `onFinish()` + `onMessage(uiMsg, false)`, sets status to `'idle'` |
| 123-143 | Error handling | AbortError → silent return; other errors → retry once (if `attempt < MAX_RETRIES`) → `onError` |
| 197-210 | `stop()` | Aborts controller, cleans up state, clears DB streaming flag |

**Supporting function:**

| Lines | Element | What Happens |
|-------|---------|-------------|
| 55-68 | `persistMessage()` | Saves message to DB; on final message, marks unread + dispatches `unread-changed` + `background-stream-completed` events if not active session |

---

## 4. LLM Request Assembly

**File:** `core/models/nativeChatCompletion.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 18-25 | `selectRoute()` | Maps model name to proxy route: `gpt-4o-mini` → `proxyGpt4oMini`, `o3` → `proxyO3`, `o4-mini` → `proxyO4Mini`, default → `proxyGpt4o` |
| 27-46 | `convertMessages()` | Raw messages → native types (`userMessage`, `assistantMessage`, `toolMessage`); filters system messages |
| 58 | `nativeChatCompletion()` | Main factory |
| 59-60 | Route + Model | Selects route, creates model instance via `route.model({ id: route.id })` |
| 62-72 | API key | Tries `getProviders(projectId).get('openai').apiKey`, falls back to `localStorage.getItem('openai_api_key')` |
| 74-79 | System prompt | `buildNativeSystemPrompt({ modeId, projectId, projectContext, connectedConnectors })` |
| 81-84 | Tools | `materialize()` → tool definitions → `makeToolDefinition()` for each |
| 86-93 | LLMRequest | `new LLMRequest({ model, system, messages, tools, toolChoice, http })` |
| 95 | Tool loop | `createToolLoop({ routes: [route], abortSignal })` |
| 97-110 | ToolExecutor | On tool call: `mat.settle({ id, name, input }, context)` → maps result |
| 112 | Return stream | `loop(request, executor)` → `Stream<LLMEvent, Error>` |

---

## 5. Proxy Route Definitions

**File:** `core/tools/nativeRoutes.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 4 | `PROXY_BASE` | `"/proxy/https://api.openai.com/v1"` |
| 6-9 | `proxyGpt4o` | `gpt4o.with({ endpoint: { baseURL: PROXY_BASE }, auth: Auth.none })` |
| 11-14 | `proxyGpt4oMini` | Same pattern |
| 16-19 | `proxyO3` | Same pattern |
| 21-24 | `proxyO4Mini` | Same pattern |
| 26-31 | `proxyRoutes` | Array of all four (unused by nativeChatCompletion; each imported individually) |

---

## 6. Tool Loop

**File:** `packages/llm-providers/src/adapters/tool-loop.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 45-50 | `createToolLoop(config)` | Returns `(request, executor) => Stream<LLMEvent, Error>`. Default `maxSteps = 10` |
| 52 | Layer | `llmClientLayer(config.routes)` — provides LLMClient via Effect |
| 55-157 | `loop()` | Recursive, up to `maxSteps` |
| 60-62 | Max steps guard | Returns `Stream.empty` if limit reached |
| 64-69 | Client stream | `client.stream(request)`, wrapped with `Stream.interruptWhen(abortEffect)` |
| 71-80 | Collect events | `Stream.runCollect(rawStream)` — buffers all events; catches errors as `provider-error` |
| 83-94 | Process | If no tool calls → return events as-is |
| 96-117 | Execute tools | `Effect.forEach(toolCalls, ...)` — each call: `executor({ id, name, input })` |
| 119-132 | Build follow-up | `assistantMessage(ToolCallPart[])` + `toolMessage(ToolResultPart[])` |
| 134-141 | Recurse | `updateLLMRequest(request, { messages })` → `loop(nextRequest, executor, step + 1)` |
| 143-146 | Combined stream | Original events (minus `finish`) + tool results + recursive concat |
| 159-160 | Entry | `Stream.unwrap(loop(request, executor, 0).pipe(Effect.provide(layer)))` |

---

## 7. LLM Client

**File:** `packages/llm-providers/src/route/client.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 228-234 | `stream()` | `prepareRequest` → `streamPrepared` |
| 172-195 | `prepareRequest()` | Route matching + request preparation |
| 175-176 | Route matching | `typeof model.route === 'string' ? model.route : model.route?.id` → `routes.find(r => r.id === routeId)` |
| 177-180 | Not found | Returns `NoRouteReason` error |
| 181 | Merge defaults | `authAndDefaults(route, merged)` — applies route auth + default headers/generation |
| 182 | Build body | `route.body.from(merged)` → provider-specific format |
| 183 | Prepare transport | `route.prepareTransport(body, merged)` → URL + bodyText + headers |
| 158-170 | `streamPrepared()` | `route.streamPrepared(prepared, request, runtime)` |
| 203-219 | Transport runtime | `http.execute` uses `fetch()` in browser, returns `Response` with `ReadableStream` |
| 197-256 | `layer(routes)` | Creates LLMClient service with transport runtime |

---

## 8. Auth

**File:** `packages/llm-providers/src/route/auth.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 92 | `Auth.none` | `auth(input => Effect.succeed(input.headers))` — passthrough, used by proxy routes |
| 63-66 | `fromCredential()` | For real auth: loads secret, injects `Authorization: Bearer <secret>` |
| 68-72 | `secretEffect()` | Validates non-empty secrets |
| 144-147 | `toEffect()` | Wraps auth into Effect, maps errors to `LLMError` |

**Note:** API key auth flows through `LLMRequest.http.headers` (set in `nativeChatCompletion.ts:92`), not through route auth.

---

## 9. Endpoint URL

**File:** `packages/llm-providers/src/route/endpoint.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 34-39 | `render()` | `base = (endpoint.baseURL ?? "").replace(/\/+$/, "")` → `new URL(base + path)` |
| | Result | Proxy: `"/proxy/https://api.openai.com/v1/chat/completions"` |

---

## 10. HTTP Transport

**File:** `packages/llm-providers/src/route/transport/http.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 28-42 | `prepare()` | Renders endpoint URL, JSON-encodes body, applies auth headers (merges route defaults + request headers) |
| 44-61 | `frames()` | `runtime.http.execute(url, bodyText, headers)` → `fetch()` |
| 47-53 | SSE processing | `Response` → `ReadableStream` → `Stream.fromReadableStream()` → framing |

---

## 11. Server Proxy

**File:** `server/src/routes/proxy.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 8-74 | `router.all('/proxy/*')` | Generic HTTP proxy |
| 9-10 | Extract URL | Strips `/proxy/` prefix → `actualUrl` |
| 12-27 | Validate | Parses URL, ensures `http:`/`https:`, rejects private IPs (loopback, RFC1918) |
| 29-33 | Forward headers | Copies all request headers except `host`, `connection`, `accept-encoding` |
| 35-36 | Timeout | 120s abort timeout |
| 39-44 | Fetch | `fetch(actualUrl, { method, headers, body, signal })` |
| 48-52 | Response headers | Forwards response headers (filtered) |
| 54-67 | Stream response | `ReadableStream` reader → `res.write()` chunk pump |
| 68-73 | Error | `AbortError` → 504, others → 502 |

**Server bootstrap** (`server/src/index.ts`):
- Line 103: `app.use(auth)` — API key middleware
- Line 105: `app.use(proxyRoutes)` — mounts proxy
- Lines 119-134: DB migration, content tool registration, start on PORT

---

## 12. SSE Framing

**File:** `packages/llm-providers/src/route/framing.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 15-27 | `Framing.sse` | `Stream<Uint8Array>` → `Stream<string>` |
| 20 | `Stream.decodeText()` | Bytes → string |
| 21 | `Stream.splitLines` | Split by newlines |
| 22 | Filter `data: ` | Keep lines starting with `"data: "` |
| 23 | Strip prefix | Remove `"data: "` prefix |
| 24 | Filter `[DONE]` | Remove the end sentinel |

Result is parsed as JSON by the protocol.

---

## 13. OpenAI Protocol

**File:** `packages/llm-providers/src/protocols/openai-chat.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 49-165 | `body.from()` | `LLMRequest` → `OpenAIChatBody` |
| 51-97 | Message conversion | System, user, assistant, tool → OpenAI format (tool_calls, tool_call_id, parts) |
| 99-103 | Parameters | `model`, `stream: true`, `stream_options: { include_usage: true }` |
| 106-112 | Tools | `convertToolDefinition()` → OpenAI tool format + `tool_choice` |
| 114-123 | Generation options | `maxTokens` → `max_tokens`, `temperature`, `topP`, `topK`, etc. |
| 125-137 | Response format | `response_format` mapping |
| 139-151 | Provider options | `reasoning_effort`, `user`, `metadata` |
| 166-175 | Parse | `Schema.parseJson` on SSE data strings |
| 176-180 | Initial state | Empty `textBlocks`, `reasoningBlocks`, `toolCalls` |
| 181-249 | `step()` | SSE chunk → typed LLMEvent |
| 190-198 | Text delta | `delta.content` → `step-start` + `text-start` + `text-delta` |
| 200-207 | Reasoning delta | `delta.reasoning_content` → `reasoning-start` + `reasoning-delta` |
| 209-229 | Tool calls | `delta.tool_calls` → `tool-input-start` + `tool-input-delta` + `tool-call` |
| 231-246 | Finish | `finish_reason` → `step-finish` + `finish` with Usage |
| 250 | Terminal | `finish_reason !== null` |
| 251-269 | `onHalt()` | Premature end → emits partial tool calls + finish |

---

## 14. Event Reducer

**File:** `src/lib/llmEventReducer.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 29-31 | `createEmptyState()` | `{ messages: [], currentMessage: null, status: 'idle' }` |
| 51-173 | `reduceEvent(state, event)` | LLMEvent → accumulated state |
| 53-55 | `step-start` | status = `'streaming'` |
| 57-59 | `text-start` | Create new `currentMessage` |
| 61-69 | `text-delta` | Append to `currentMessage.content` |
| 76-85 | `reasoning-delta` | Append to `currentMessage.reasoning` |
| 87-98 | `tool-input-start` | Add new `ToolCallState { status: 'streaming' }` |
| 107-122 | `tool-call` | Update tool call input, status = `'streaming'` |
| 124-135 | `tool-result` | Update tool call result, status = `'complete'` |
| 137-148 | `tool-error` | Set status = `'error'`, store error message |
| 154-161 | `finish` | Move `currentMessage` → `messages[]`, reset to null, status = `'idle'` |
| 163-169 | `provider-error` | status = `'error'`, store error message |

---

## 15. Tool Runtime

### Materialization

**File:** `packages/tool-runtime/src/registry/materialize.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 22-49 | `materialize()` | Lists all registered tools, applies filters, creates `Materialization` |
| 23 | `listMerged()` | Global + session tool registrations |
| 27-37 | Filter + convert | `filterByScope`, `filterBySource`, `permissions` → `toMaterializedTool()` |
| 42-48 | `settle(call, context)` | Lookup tool by name → `tool.settle(call, context)` |

### Tool Execution

**File:** `packages/tool-runtime/src/tool/make.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 23-39 | `make(config)` | Create tool definition with runtime (description, schemas, execute) |
| 57-91 | `toMaterializedTool()` | Convert to `MaterializedTool` |
| 63-67 | Schema | `inputJsonSchema` from runtime |
| 75-77 | Decode | `Schema.decodeUnknown(runtime.inputSchema)(call.input)` |
| 78-80 | Execute | `runtime.execute(decoded, context)` |
| 81-88 | Result | `{ type: 'success', value: output }` or `{ type: 'error', message, error }` |

### Registration

**File:** `core/tools/initToolRuntime.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 7-13 | `ensureToolRuntimeInit()` | Registers content tools + subagent tools globally (once) |
| 15-23 | `buildRuntimeTools()` | Alternative: `materialize()` → `toAISDKTools()` for AI SDK path |

### AI SDK Adapter (alternative path)

**File:** `packages/tool-runtime/src/registry/adapter.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 57-105 | `toAISDKTools()` | Converts materialized tools → Vercel AI SDK `tool()` objects. Not used by native path. |

---

## 16. Database Persistence

### Client-Side

**File:** `core/utils/DatabaseService.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 4-17 | `request()` | HTTP POST to Express server (`localhost:3001`); includes `x-api-key` |
| 137-151 | `getMessages(sessionId)` | `POST /get_messages` → parses toolInvocations from JSON, maps columns |
| 153-167 | `saveMessages(sessionId, msgs)` | `POST /save_messages` → batch insert with upsert |
| 73-84 | `getSessions(projectId?)` | `POST /get_sessions` |
| 86-91 | `getSession(id)` | `POST /get_session` |
| 93-107 | `createSession()` | `POST /create_session` |
| 109-122 | `updateSession()` | `POST /update_session` (streaming, unread, pinned, etc.) |

### Server-Side Routes

**File:** `server/src/routes/messages.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 6-26 | `POST /get_messages` | `SELECT ... FROM messages WHERE session_id = $1 ORDER BY created_at ASC` |
| 28-67 | `POST /save_messages` | Batch upsert via `ON CONFLICT (id) DO UPDATE`; updates `chat_sessions.updated_at` |

**File:** `server/src/routes/sessions.ts`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 6-28 | `POST /get_sessions` | `SELECT ... ORDER BY pinned DESC, COALESCE(updated_at, created_at) DESC` |
| 45-61 | `POST /get_session` | Single session lookup |
| 63-80 | `POST /create_session` | INSERT with optional project creation |
| 82-121 | `POST /update_session` | Dynamic UPDATE SET for title, lastMessage, archived, pinned, unread, streaming |
| 123-133 | `POST /delete_session` | DELETE from chat_sessions |

### Database Schema

**File:** `server/src/db.ts`

| Lines | Table | Columns |
|-------|-------|---------|
| 100-111 | `chat_sessions` | `id`, `title`, `last_message`, `project_id`, `archived`, `pinned`, `unread`, `streaming`, `created_at`, `updated_at` |
| 113-124 | `messages` | `id`, `session_id`, `role`, `content`, `reasoning`, `tool_invocations`, `model`, `created_at`, `content_before_tool`, `content_after_tool` |

---

## 17. UI Update

**File:** `src/components/chat/MessageList.tsx`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 145-166 | Message render | `messages.map(m => ChatMessageRow)` — `isStreaming` = `true` when `i === lastAssistantIndex` |
| 79-95 | Auto-scroll | `ResizeObserver` + scroll to bottom when near bottom |
| 168-172 | ThinkingAnimation | Shown while loading with no content yet |
| 197-206 | Scroll button | ArrowDown icon when scrolled up |
| 208-221 | ChatInput | Bottom input with loading state |

**File:** `src/components/chat/ChatMessageRow.tsx`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 48-72 | Render | `UserBubble` for user messages, `AssistantBubble` for assistant messages |
| 159 | isStreaming | `true` for last assistant message while loading |

**File:** `src/components/chat/AssistantBubble.tsx`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 38-192 | Render | Markdown rendering, tool artifact streaming, reasoning display, actions, duration display |
| 128 | Content check | If no content and not streaming: null; if content: MarkdownMessage; if streaming no content: skeleton |

**File:** `src/components/chat/ChatInput.tsx`

| Lines | Element | What Happens |
|-------|---------|-------------|
| 143 | disabled | `contentEditable={!isLoading}` |
| 147 | placeholder | `'Generating...'` when loading |
| 162 | SendButton | Becomes stop button during loading |
