# Antigravity Cloud API Contract

> **STATUS**: Contract specification. A REAL backend now exists at `server/src/routes/antigravity.ts` (replaces `mock-antigravity.ts`), backed by `@doktor/llm-providers` and real provider keys loaded from the SQLite `app_config` table. It implements the full contract (identity, chat SSE, jobs create/poll/events/stream with cursor reattach). Set `ANTIGRAVITY_DEFAULT_MODEL` to choose the cloud model (default `mistral-small-latest`); keys resolve from stored provider API keys.

---

## 1. Overview

Antigravity mode delegates LLM execution to an external cloud service. The cloud service accepts a chat request, runs it (possibly asynchronously), and streams results back via SSE. Authentication is via a pre-shared API key.

## 2. Base URL

| Environment | URL |
|---|---|
| Production | `https://api.antigravity.ai/v1` |
| Staging | `https://staging.api.antigravity.ai/v1` |
| Local mock | `http://localhost:3001/antigravity/v1` |

The base URL is injectable via the `ANTIGRAVITY_BASE_URL` env var (defaults to production).

## 3. Authentication

All endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <ANTIGRAVITY_API_KEY>
```

The API key is resolved from `process.env.ANTIGRAVITY_API_KEY`.

## 4. Endpoints

### 4.1 Identity / Ping

Lightweight endpoint to verify the API key and service availability.

```
GET /identity
```

**Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "antigravity",
  "version": "1.0.0"
}
```

**Response `401 Unauthorized`**:
```json
{
  "error": "invalid_api_key",
  "message": "The provided API key is not valid."
}
```

### 4.2 Synchronous Chat (streaming)

```
POST /chat
```

**Request**:
```json
{
  "model": "antigravity-1",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "stream": true,
  "max_tokens": 4096,
  "temperature": 0.7
}
```

**Response**: SSE stream (see §5. Event Format).

### 4.3 Asynchronous Job Execution

For long-running tasks, the client can create a job and poll for results.

#### Create Job

```
POST /jobs
```

**Request**:
```json
{
  "model": "antigravity-1",
  "messages": [
    { "role": "user", "content": "..." }
  ],
  "max_tokens": 16384,
  "temperature": 0.7
}
```

**Response `202 Accepted`**:
```json
{
  "job_id": "ag_job_abc123def456",
  "status": "queued",
  "created_at": "2026-07-17T20:00:00Z"
}
```

#### Get Job Status

```
GET /jobs/:job_id
```

**Response `200 OK`**:
```json
{
  "job_id": "ag_job_abc123def456",
  "status": "running",
  "progress": 0.45,
  "created_at": "2026-07-17T20:00:00Z",
  "updated_at": "2026-07-17T20:01:30Z"
}
```

Possible statuses: `queued`, `running`, `completed`, `failed`, `cancelled`.

#### Get Job Results

```
GET /jobs/:job_id/events
```

Returns SSE stream of result events (same format as §5). Available when status is `completed`.

#### Reattach to Running Job

```
GET /jobs/:job_id/stream?cursor=<last_event_id>
```

If the client disconnects mid-stream, it can reattach using the same job ID and an optional cursor. The server resumes streaming from the cursor position (or from the beginning if no cursor).

## 5. Event Format (SSE)

All streaming endpoints return Server-Sent Events. Each event has the format:

```
event: <event_type>
data: <json_payload>
```

### Event Types

| Event Type | Direction | Payload | Description |
|---|---|---|---|
| `text_delta` | downstream | `{ "id": "block_1", "text": "Hello..." }` | A chunk of generated text |
| `thinking_delta` | downstream | `{ "id": "thought_1", "text": "I need to..." }` | A chunk of model reasoning |
| `tool_call_delta` | downstream | `{ "id": "tc_1", "name": "search", "input": "..." }` | Tool call request |
| `tool_result_delta` | downstream | `{ "id": "tc_1", "result": {...} }` | Tool execution result |
| `error` | downstream | `{ "code": "...", "message": "..." }` | Error during execution |
| `finish` | downstream | `{ "reason": "stop", "usage": {...} }` | Stream completed successfully |
| `done` | downstream | `{}` | Signals end of SSE stream (always last) |

## 6. Translation to Internal Event Schema

The raw antigravity events must be translated to the internal `LLMEvent` schema (`packages/llm-providers/src/schema/event-schemas.ts`) before they reach UI components:

| Antigravity Event | Internal LLMEvent |
|---|---|
| `text_delta` | `TextDelta { type: "text-delta", id, text }` |
| `thinking_delta` | `ReasoningDelta { type: "reasoning-delta", id, text }` |
| `tool_call_delta` | `ToolCall_ { type: "tool-call", id, name, input }` |
| `tool_result_delta` | `ToolResult_ { type: "tool-result", id, name, result }` |
| `error` | `ProviderErrorEvent { type: "provider-error", message }` |
| `finish` | `Finish { type: "finish", reason, usage }` |

The translation function lives at `packages/llm-providers/src/adapters/antigravity-adapter.ts` (not yet built).

## 7. Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `invalid_api_key` | 401 | Missing or invalid API key |
| `rate_limited` | 429 | Too many requests |
| `model_unavailable` | 503 | Requested model is temporarily unavailable |
| `job_not_found` | 404 | Job ID does not exist |
| `invalid_request` | 400 | Malformed request body |
| `internal_error` | 500 | Unexpected server error |

## 8. Notes for Backend Implementation

- All SSE events are UTF-8 encoded
- The `done` event MUST be the final event in every stream
- Job IDs have the prefix `ag_job_` followed by 12 alphanumeric characters
- Jobs expire 24 hours after completion; `GET /jobs/:id` returns `404` after expiry
- Rate limit: 100 requests per minute per API key (return `429` with `Retry-After` header)
