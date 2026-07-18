# Antigravity Mode — Harness, Capabilities, Limits & Model Configuration

> **Scope:** This document describes the **Antigravity agent mode backend harness**
> only — what it is, how it is wired, what it can and cannot do, and how the cloud
> model is selected/configured. For the frontend UI contract, see
> `ANTIGRAVITY_FRONTEND_SPEC.md`.
>
> Implementation: `server/src/routes/antigravity.ts` (HTTP/SSE contract) and
> `server/src/antigravity/runtime.ts` (real LLM execution). Real LLM calls go
> through `@doktor/llm-providers` (`packages/llm-providers`).

---

## 1. What the harness is

Antigravity is the **cloud agent mode**. It is a self-contained backend that:

1. Accepts a chat/job request over the Antigravity contract (`/antigravity/v1`).
2. Resolves a **real cloud LLM** provider from keys stored in the server's SQLite
   `app_config` table.
3. Executes the request against that provider (optionally pre-fetching web research
   via the local **go-crawl** service).
4. Streams the result back as Server-Sent Events (token-by-token) using the
   Antigravity event schema.

It is **not** a mock. There is no fake data — every token comes from a live API call.

### Process / lifecycle
- Implemented as Express routes mounted at `/antigravity/v1` inside the main DokTor
  server (`server/src/index.ts`).
- Keys are hydrated from the DB **lazily on first request** (cached afterward).
- No separate process; it runs inside the same Node server that serves the rest of
  the app.

---

## 2. Capabilities

| Capability | Status | Notes |
|---|---|---|
| Real cloud LLM completion (streaming) | ✅ | `POST /chat`, `stream:true` → SSE tokens |
| Real cloud LLM completion (one-shot) | ✅ | `POST /chat`, `stream:false` → JSON |
| Async long-running jobs | ✅ | `POST /jobs` → poll `GET /jobs/:id` → `GET /jobs/:id/events` |
| Resumable job stream (cursor reattach) | ✅ | `GET /jobs/:id/stream?cursor=<n>` resumes from event index |
| Web research via go-crawl (pre-fetch) | ✅ | `researchQuery` field → calls the `research` tool against `localhost:8080` |
| Model-driven tool use (research, etc.) | ⚠️ | Works when the provider honors `tool_choice`; not all do (see §4) |
| Identity / capability ping | ✅ | `GET /identity` |
| Rate limiting | ✅ | 100 req/min per key; `429` + `Retry-After: 60` |
| Job TTL / expiry | ✅ | Completed/failed jobs expire 24h after completion (`404` after) |
| Thinking / reasoning events | ✅ | Surfaced as `thinking_delta` when the model emits them |
| Multi-turn history | ⚠️ | Client must resend full `messages` array each call (no server memory) |

---

## 3. Request/response contract (harness level)

Base URL: `http://localhost:3001/antigravity/v1` (or `ANTIGRAVITY_BASE_URL`).

Auth: `Authorization: Bearer <ANTIGRAVITY_API_KEY>` on every request. The server
currently accepts **any non-empty** key (locally `test-key` works). Missing/invalid →
`401 { "error": "invalid_api_key" }`.

### `GET /identity`
`200 { "status":"ok", "service":"antigravity", "version":"1.0.0" }`

### `POST /chat`
Body:
```json
{
  "model": "antigravity-1",        // or a real model id
  "messages": [ { "role": "user", "content": "..." } ],
  "stream": true,                  // false => single JSON
  "systemPrompt": "...",           // optional
  "enableTools": false,            // optional; model-driven tool use
  "forceTools": false,             // optional; tool_choice:"required"
  "researchQuery": "..."           // optional; backend pre-fetches go-crawl research
}
```
- `model: "antigravity-1"` → resolved server-side to the configured default (§5).
- Streaming SSE events: `text_delta`, `thinking_delta`, `tool_call_delta`,
  `tool_result_delta`, `finish`, `error`, `done`.
- Errors: `400 invalid_request` (empty messages), `429 rate_limited`, `500 internal_error`.

### `POST /jobs` → `GET /jobs/:id` → `GET /jobs/:id/events` | `/stream`
- `POST /jobs` → `202 { "job_id":"ag_job_<12hex>", "status":"queued", "created_at": ... }`.
- `GET /jobs/:id` → `{ status, progress (0..1), created_at, updated_at }`.
  Statuses: `queued | running | completed | failed | cancelled`. Unknown id → `404`.
- `GET /jobs/:id/events` → SSE replay of all recorded events (ends with `done`).
- `GET /jobs/:id/stream?cursor=<n>` → SSE resuming from event index `n`; each event
  carries `_cursor` = next resume index.

---

## 4. Limits & caveats

1. **Provider tool-calling is unreliable across models.**
   - The harness sends up to 23 registered tools (research, write_article, video,
     plans, etc.). Some providers ignore `tool_choice:"required"` and answer from
     parametric knowledge instead of calling a tool.
   - To **guarantee** live web grounding, use `researchQuery` (backend pre-fetches
     via go-crawl and injects sources). Do not rely on the model choosing to call
     `research` on its own.
2. **go-crawl must be running for web research.** The `research` tool targets
   `http://localhost:8080/v1/search`. If it is down, the tool returns mock-style
   fallback snippets (the harness still succeeds, but sources are not real).
3. **No server-side conversation memory.** Send the full `messages` history on every
   request (same as other modes). The harness does not persist threads.
4. **Rate limits are per-provider, not per mode.** Free tiers exhaust fast. Example
   observed: Groq `llama-3.3-70b-versatile` hit its daily token cap after the
   teamwork suite ran, returning `429`. Switch `ANTIGRAVITY_DEFAULT_MODEL` if a
   provider is exhausted.
5. **One bad tool call does not abort the stream.** Tool errors are surfaced as
   `tool_result_delta` with an `error` field; the model then continues. Provider
   transport errors (e.g. `429`, network) are emitted as `error` events with a
   human-readable message (no more `[object Object]`).
6. **Job results live only in server memory.** Restarting the server drops in-flight
   and completed jobs (they are not persisted to SQLite). Respect the 24h TTL.
7. **Maximum job wall-clock is not capped**, but a client disconnect stops SSE writes
   (the task continues server-side). Reattach via `/stream?cursor=`.
8. **`enableTools:true` increases request size** (all 23 tool JSON schemas are sent).
   Some providers are sensitive to very large tool arrays; prefer `researchQuery`
   for research tasks.

---

## 5. Model configuration

### 5.1 Default model
Set via env on the **server**:
```
ANTIGRAVITY_DEFAULT_MODEL=mistral-small-latest
```
When a client sends `model: "antigravity-1"` (or omits `model`), the harness uses
this default. If unset, it falls back to `mistral-small-latest`.

Verified-working defaults (have valid keys in `app_config` and pass live tests):
- `mistral-small-latest` (Mistral) — **recommended**; quota available; 10/10 suite +
  deep research both pass.
- `llama-3.3-70b-versatile` (Groq) — fast & strong tool-caller, but **free-tier
  daily token cap** gets exhausted.
- `gemini-2.5-flash` (Google) — fixed to Bearer auth; works once key present.
- `cerebras/gpt-oss-120b`, `nvidia/llama-3.3-nemotron-super-49b-v1`,
  `sambanova/...`, `huggingface/...` — available if their keys are present.

### 5.2 Per-request model override
A client may send any real model id from
`packages/llm-providers/src/providers/model-routes.ts` (`FRONTEND_MODELS`), e.g.:
```json
{ "model": "groq:llama-3.3-70b-versatile", ... }
```
The harness resolves it via `getRouteByModelId`. If unknown, it falls back to the
default route.

### 5.3 Where the API keys come from
The harness reads keys from the server SQLite `app_config` table (the same store the
app UI writes to). Mapping (`configKey` → env var the provider layer expects):

| `app_config` key | Env var |
|---|---|
| `anthropic-api-key` | `ANTHROPIC_API_KEY` |
| `openai-api-key` | `OPENAI_API_KEY` |
| `google-api-key` | `GOOGLE_API_KEY` |
| `deepseek-api-key` | `DEEPSEEK_API_KEY` |
| `mistral-api-key` | `MISTRAL_API_KEY` |
| `cohere-api-key` | `COHERE_API_KEY` |
| `groq-api-key` | `GROQ_API_KEY` |
| `together-api-key` | `TOGETHER_API_KEY` |
| `openrouter-api-key` | `OPENROUTER_API_KEY` |
| `nvidia-api-key` | `NVIDIA_API_KEY` |
| `cerebras-api-key` | `CEREBRAS_API_KEY` |
| `sambanova-api-key` | `SAMBANOVA_API_KEY` |
| `huggingface-api-key` | `HUGGINGFACE_API_KEY` |
| `cloudflare-api-key` | `CLOUDFLARE_API_KEY` |

Only keys present (non-empty) in `app_config` are hydrated. To add a provider, set
its key via the app UI/config (writes `app_config`) and restart (or it hydrates on
next request).

### 5.4 `ANTIGRAVITY_API_KEY` (mode auth)
Separate from provider keys. It is the bearer token clients send to `/antigravity/v1`.
Currently any non-empty value is accepted. Set it wherever you configure the mode
(e.g. env or app config) so the frontend can authenticate.

---

## 6. Research / "deep task" harness behavior

For the user-facing "run research for ~2 min and return depth":

1. Client sends `researchQuery: "<topic>"` (and optionally `model`).
2. Harness calls the `research` tool → go-crawl `localhost:8080/v1/search?query=...`
   with `depth:"deep"` (up to 8 sources).
3. Harness emits `tool_call_delta` then `tool_result_delta` (source count + summary)
   so the UI can show a "researching…" chip.
4. Sources are injected into the system prompt with an instruction to **synthesize
   directly** (no further tool calls).
5. The cloud model streams the final report as `text_delta` events.

This guarantees real web grounding regardless of the model's own tool-calling
behavior, and produces long (1.5k–2.5k word) in-depth reports in ~30–60s.

---

## 7. Verification status (live)

- `tests/antigravity-e2e/run.ts` — **10/10** deterministic tasks pass against live
  Mistral (arithmetic, capitals, acronyms, date math, lists, definitions, counting,
  boolean logic, unit conversion, translation).
- `tests/antigravity-e2e/single-research.ts` — **PASS**: go-crawl pre-fetch + 2,144-word
  8-section report, 7 real cited URLs, ~48s.
- `tests/antigravity-e2e/verify-reattach.ts` — **PASS**: `/jobs/:id/stream?cursor=2`
  resumed from event index 2.

Run:
```
ANTIGRAVITY_API_KEY=test-key ANTIGRAVITY_DEFAULT_MODEL=mistral-small-latest \
  npx tsx tests/antigravity-e2e/run.ts
```

---

## 8. Known issues being tracked
- Provider tool-calling (`enableTools:true`) is model-dependent; prefer
  `researchQuery` for research. (Root-cause fixes already applied: JSON-schema tool
  conversion, readable error messages.)
- Google route previously sent `x-goog-api-key`; fixed to `Authorization: Bearer`
  (Gemini now works).
- Jobs are in-memory only (not persisted to SQLite).
