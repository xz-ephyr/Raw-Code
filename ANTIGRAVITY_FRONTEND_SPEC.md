# Antigravity Agent Mode — Frontend UI Specification

> **Purpose:** This document fully describes the Antigravity agent backend so the
> frontend (input box + chat surface) can be built to match it 1:1. Everything
> below is implemented and verified in `server/src/routes/antigravity.ts` and
> `server/src/antigravity/runtime.ts`. The API base path is
> `http://localhost:3001/antigravity/v1` (or `ANTIGRAVITY_BASE_URL` in prod).

---

## 1. What this mode is

Antigravity is the **cloud agent** mode. When the user selects it, their prompt
is sent to the backend, which dispatches the real request to a live cloud LLM
provider (keys are loaded from the server's SQLite `app_config`; default model is
`mistral-small-latest`, overridable via `ANTIGRAVITY_DEFAULT_MODEL`). The result
streams back token-by-token over Server-Sent Events and is rendered in the
existing chat/input-box surface.

There are **two execution styles** the UI must support:

1. **Synchronous streaming chat** (`POST /chat`, `stream:true`) — the primary
   path. The assistant message types out live as events arrive.
2. **Asynchronous job pipeline** (`POST /jobs` → poll → stream) — for long tasks.
   The UI can create a job, show a progress indicator, and either pull the
   finished events or reattach a live stream by cursor.

---

## 2. Authentication (every request)

Every Antigravity request needs a bearer token in the header:

```
Authorization: Bearer <ANTIGRAVITY_API_KEY>
```

- The server currently accepts **any non-empty** key (e.g. `test-key` locally).
- Missing/invalid → `401` JSON: `{ "error": "invalid_api_key", "message": "..." }`.
- **UI implication:** the mode is "available" once a key is configured. If the
  `/identity` ping returns `401`, show the mode as locked / "configure API key".

---

## 3. Endpoint contract (exact shapes)

### 3.1 `GET /identity` — health / capability ping
Response `200`:
```json
{ "status": "ok", "service": "antigravity", "version": "1.0.0" }
```
Use this on mode-select / app load to flip the badge to **ready** (or **locked**
on `401`).

### 3.2 `POST /chat` — synchronous streaming
Request body:
```json
{
  "model": "antigravity-1",          // or a real model id (e.g. "mistral-small-latest")
  "messages": [ { "role": "user", "content": "..." } ],
  "stream": true,                    // false => one-shot JSON (see below)
  "systemPrompt": "...",             // optional
  "enableTools": false               // optional; true currently unstable (see §7)
}
```
- `model: "antigravity-1"` is auto-resolved server-side to the configured default.
- If `messages` is empty/missing → `400` `{ "error": "invalid_request" }`.
- Rate limit exceeded → `429` with `Retry-After: 60` header.

**Streaming response** is `text/event-stream`. Each event:
```
event: <type>
data: <json>

```

**Non-streaming response** (`stream:false`) is a single JSON:
```json
{
  "id": "chat_<uuid>",
  "choices": [ { "role": "assistant", "content": "<full text>" } ],
  "usage": { "inputTokens": 264, "outputTokens": 4204 }
}
```

### 3.3 `POST /jobs` — create a long-running job
Request body: same shape as `/chat` (`model`, `messages`, `systemPrompt`, `enableTools`).
Response `202`:
```json
{ "job_id": "ag_job_<12 hex chars>", "status": "queued", "created_at": "<ISO8601>" }
```
- Job IDs always start with `ag_job_` + 12 alphanumeric chars.

### 3.4 `GET /jobs/:jobId` — poll status
```json
{
  "job_id": "ag_job_...",
  "status": "running",            // queued | running | completed | failed | cancelled
  "progress": 0.45,               // 0..1 float
  "created_at": "<ISO8601>",
  "updated_at": "<ISO8601>"
}
```
- Unknown id → `404` `{ "error": "job_not_found" }`.
- UI: poll every ~1s; render a progress bar from `progress`; when `completed`,
  pull results (§3.5) or attach the live stream (§3.6).

### 3.5 `GET /jobs/:jobId/events` — fetch all result events
Server-Sent Stream of every event recorded for the job (including `done`). Use
this once the job is `completed` and you just want the full transcript.

### 3.6 `GET /jobs/:jobId/stream?cursor=<n>` — reattach live
SSE stream that **resumes from `cursor`** (0-based event index). Each event's
`data` carries a `_cursor` field = the next index to resume from.
```
event: text_delta
data: { "id": "block_1", "text": "...", "_cursor": 4 }
```
- If `cursor` is omitted/0, replays from the beginning.
- **UI implication:** if the browser tab disconnects mid-job, reconnect with the
  last seen `_cursor` to resume without duplication.

### 3.7 Job TTL
Completed/failed jobs expire **24h** after completion; `GET /jobs/:id` then
returns `404`. Keep this in mind if you persist job URLs.

---

## 4. SSE event types (render these)

| Event | `data` shape | UI rendering |
|---|---|---|
| `text_delta` | `{ "id": "block_1", "text": "Hello" }` | Append `text` to the streaming assistant message. Multiple `id`s = multiple content blocks. |
| `thinking_delta` | `{ "id": "thought_1", "text": "..." }` | Render in a collapsible **"Reasoning / Thinking"** panel above the answer. Do NOT put into the main answer text. |
| `tool_call_delta` | `{ "id": "tc_1", "name": "research", "input": {...} }` | Show a **tool activity chip** ("🔍 research…") with the invoked tool name. |
| `tool_result_delta` | `{ "id": "tc_1", "name": "research", "result": {...} }` | Expand the chip into a result preview (title/snippet or JSON summary). |
| `finish` | `{ "reason": "stop", "usage": { "inputTokens": 264, "outputTokens": 4204 } }` | Mark streaming complete; show token usage footer. |
| `error` | `{ "code": "provider_error" \| "internal_error", "message": "..." }` | Show an inline error state in the message bubble; keep any partial `text_delta` already received. |
| `done` | `{}` | **Always the final event.** Close the stream, finalize the message. |

**Ordering guarantee:** `done` is always last. `finish` precedes `done`. A stream
may contain `error` instead of `finish` on failure.

---

## 5. UI components to build

### 5.1 Mode selector / badge
- A mode chip: **Antigravity (cloud)** with an icon (`AntigravityIcon`,
  `antigravity-color.svg` already exists in `dist/assets`).
- On select, call `GET /identity`:
  - `200` → badge **Ready** (green).
  - `401` → badge **Locked / configure key** (amber).
- The selftest status endpoint `GET /api/selftest/status` also exposes
  `modes.antigravity.available` (now `true` since the real backend is built).

### 5.2 Input box (the primary surface)
Identical to your existing text input — the user types a prompt and hits send.
On send in Antigravity mode:
1. POST `messages:[{role:"user",content}]` to `/chat` with `stream:true`.
2. Open an `EventSource`-style reader (fetch + ReadableStream; browsers can't use
   native `EventSource` for POST, so use `fetch` streaming — see §6).
3. Render events per §4.

### 5.3 Streaming assistant message bubble
Must handle three parallel streams of content:
- **Main answer** (from `text_delta`).
- **Thinking/reasoning** (from `thinking_delta`) — collapse by default, expandable.
- **Tool activity** (from `tool_call_delta` / `tool_result_delta`) — a stack of
  chips that resolve to results. Show a spinner on the chip until its
  `tool_result_delta` arrives.

### 5.4 Progress / job view (for long tasks)
When you choose the async path or detect a long task:
- After `POST /jobs`, show a card with `job_id`, a **progress bar** (`progress`),
  and live status text.
- Poll `GET /jobs/:id` until `completed`.
- Then either render the buffered `/events` stream, or attach `/stream?cursor=`
  for live tail.
- Persist `job_id` so a refresh can re-poll (remember the 24h TTL).

### 5.5 Usage footer
After `finish`, show `inputTokens` / `outputTokens` (e.g. "264 in · 4204 out").
Helps convey the "cloud compute" nature of the mode.

### 5.6 Error states
- `401 invalid_api_key` → global "API key not configured" banner.
- `429 rate_limited` → "Slow down — retry in 60s" toast; respect `Retry-After`.
- `400 invalid_request` → "Message is required".
- stream `error` event → inline red message in the bubble, keep partial text.
- network drop → reconnect using last `_cursor` if a job stream; for `/chat`
  just show a "connection lost, resend" affordance.

---

## 6. Frontend streaming implementation notes

Native `EventSource` only supports GET. Since `/chat` and `/jobs` are POST, use
`fetch` + `ReadableStream` reader and parse the SSE manually:

```ts
async function streamAntigravity(prompt: string, onEvent: (evt: string, data: any) => void) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'antigravity-1', stream: true, messages: [{ role: 'user', content: prompt }] }),
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '', evt = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('event: ')) evt = line.slice(7).trim();
      else if (line.startsWith('data: ')) onEvent(evt, JSON.parse(line.slice(6)));
    }
  }
}
```

Map `onEvent('text_delta', d)` → append `d.text`; `'thinking_delta'` → thinking
panel; `'tool_call_delta'`/`'tool_result_delta'` → tool chips; `'finish'` → finalize;
`'error'` → error UI; `'done'` → close.

---

## 7. Known backend limitations (design around these)

1. **Tools are currently unstable when `enableTools:true`.** If the model emits a
   tool call, the request fails with `provider_error: [object Object]`. The fix
   (convert Effect Schema → JSON schema before `makeToolDefinition`) is pending.
   **Recommendation:** ship the UI with `enableTools:false` for v1; the agent still
   produces deep, long answers from cloud reasoning alone. Wire a "tools" toggle
   later once the backend fix lands.
2. **The `research` tool depends on a local `go-crawl` server** (`localhost:8080`)
   that is not running in this environment; it would fall back to mock snippets.
   Don't rely on live web grounding yet.
3. **Default model** is `mistral-small-latest`. To let users pick a model, send the
   real model id in `model` (e.g. `groq: llama-3.3-70b-versatile`,
   `google: gemini-2.5-flash` — note Gemini was just fixed to use Bearer auth).
4. **No conversation memory in the backend** — you must send the full `messages`
   array each request (same as other modes). Maintain history client-side and
   append before sending.

---

## 8. Verified behaviors (from the real test suite)

- `POST /chat` streaming: **10/10** deterministic tasks passed against live
  Mistral (arithmetic, capitals, acronyms, date math, lists, definitions,
  counting, boolean logic, unit conversion, translation).
- Single **deep-research** task: 1,671-word, 8-section briefing generated in
  ~33s, all sections present, streamed as 1,762 `text_delta` events.
- Job pipeline: create → poll `running`/`completed` → `/stream?cursor=2` correctly
  resumed from event index 2 (verified `cursors seen: 3,4,5,6,7`).

---

## 9. Suggested UI feature checklist

- [ ] Mode chip "Antigravity (cloud)" + readiness badge from `/identity`.
- [ ] Input box posts to `/chat` with `stream:true`.
- [ ] Live-typing assistant bubble from `text_delta`.
- [ ] Collapsible "Reasoning" panel from `thinking_delta`.
- [ ] Tool-activity chips from `tool_call_delta`/`tool_result_delta` (hidden by
      default until tools are stable).
- [ ] Token usage footer from `finish`.
- [ ] Progress card + polling for the async `/jobs` path.
- [ ] Cursor-based reconnect for `/jobs/:id/stream`.
- [ ] Error/empty/rate-limit/401 states.
- [ ] Client-side message history appended to each `messages` payload.
