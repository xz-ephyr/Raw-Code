# Deep Research Test Harness

**File:** `tests/deep-research-test.ts`  
**Run:** `npx tsx tests/deep-research-test.ts`

A standalone end-to-end test that validates the full research pipeline: LLM agent → `research` tool call → go-crawl execution → result synthesis. It bypasses the Effect tool runtime and calls the LLM API + go-crawl directly, isolating the data plane from the orchestration layer.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Test Harness                    │
│                                                  │
│  ┌────────────────────────────────┐              │
│  │  main()                       │              │
│  │  1. Health-check go-crawl      │              │
│  │  2. Fetch API keys from DB      │              │
│  │  3. Resolve best provider       │              │
│  │  4. Run Test 1 (direct crawl)  │              │
│  │  5. Run Test 2 (agent loop)    │              │
│  └──────────┬─────────────────────┘              │
│             │                                     │
│  ┌──────────▼─────────────────────┐              │
│  │  directGoCrawlTest()           │              │
│  │  → GET /v1/search?maxResults=10│              │
│  │  → Check ≥1 source w/ 200+     │              │
│  │    chars of markdown content    │              │
│  └────────────────────────────────┘              │
│                                                  │
│  ┌────────────────────────────────┐              │
│  │  agentResearchTest()           │              │
│  │  → POST /v1/chat/completions   │              │
│  │    w/ research tool definition  │              │
│  │  → If LLM calls research:       │              │
│  │    callGoCrawl(query, 8)       │              │
│  │  → Feed results back as        │              │
│  │    tool response message        │              │
│  │  → LLM synthesizes final answer│              │
│  └────────────────────────────────┘              │
│                                                  │
│  ┌────────────────────────────────┐              │
│  │  callGoCrawl()                 │              │
│  │  → GET /v1/search?query=X      │              │
│  │  → Format as text block:       │              │
│  │    "Source N: title\nURL\ncontent"│            │
│  └────────────────────────────────┘              │
└─────────────────────────────────────────────────┘
```

---

## Capabilities

| Capability | Detail |
|---|---|
| **go-crawl connectivity** | Validates the go-crawl server is running and reachable on `127.0.0.1:8080`. Retries 3x for transient DuckDuckGo failures. |
| **Real web results** | Calls go-crawl with `maxResults=10`, checks at least one result has substantive markdown content (>200 chars). Confirms the crawl pipeline isn't returning empty/mock data. |
| **LLM tool-calling** | Sends a research prompt with the `research` tool definition. Verifies the LLM actually calls the tool (not just answers from training data). |
| **Depth parameter** | The system prompt instructs `depth="deep"`, the test logs whether the LLM respected it. |
| **Multi-turn agent loop** | When the LLM calls `research`, the test executes go-crawl, injects results as a `tool` role message, and calls the LLM again for synthesis. This mirrors the real agent flow. |
| **Auto provider selection** | Reads API keys from the server's SQLite `app_config` table via `POST /get_all_app_config`. Tries providers in priority order: Mistral → Groq → OpenAI. Picks the first one with a non-empty key. |
| **Timing instrumentation** | Reports per-step and total elapsed time, number of tool calls, steps taken, and final response length. |
| **Self-contained pass/fail** | Exit code 0 = all passed, exit code 1 = any failed. Suitable for CI or manual validation. |

---

## Limits

| Limit | Description |
|---|---|
| **Skips Effect runtime** | Calls the LLM API and go-crawl directly via `fetch`. Will not catch bugs in `materialize()`, `settle()`, `ToolOutputStore`, or the Event system. Those layers must be tested separately. |
| **Single tool only** | Only registers the `research` tool. Does not test `write-article`, `edit-text`, `render-video`, `subagent_run`, or any other registered tool. |
| **No streaming** | Uses `stream: false` and waits for the full response. Does not validate SSE event ordering, `text-delta` chunks, or cancellation. |
| **No auth validation** | Assumes the API key works. Does not test key rotation, expiry, or the `resolveCredential` path through `ToolExecuteContext`. |
| **Mistral content format** | Mistral returns `content` as an array of content parts (`[{type:"text", text:"..."}]`) rather than a plain string. The test concatenates with `.toString()` which produces `[object Object]` entries. The tool-calling works, but final response quality is degraded on Mistral. Groq and OpenAI return clean strings. |
| **Hardcoded query** | Test 1 always searches "impact of artificial intelligence on healthcare in 2026". Test 2 always researches "EV vs hydrogen fuel cell lifecycle emissions". Not parameterized. |
| **No assertion on answer quality** | Pass/fail for Test 2 only checks that the LLM called the research tool and produced ≥200 chars of output. It does not validate factual accuracy, source attribution, or reasoning depth. |
| **Requires running services** | Needs the server (`localhost:3001`) and go-crawl (`127.0.0.1:8080`) both running. Fails immediately if either is down. |
| **Single-threaded, sequential** | Tests run one after another. No parallel execution. |

---

## Provider Configuration

The harness uses an ordered priority list to select a provider:

```typescript
const OPENAI_COMPAT_PROVIDERS = [
  { id: 'mistral',     keyName: 'mistral-api-key',     baseUrl: 'https://api.mistral.ai/v1',    models: ['mistral-large-latest', 'mistral-small-latest'] },
  { id: 'groq',        keyName: 'groq-api-key',        baseUrl: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'llama-4-scout-17b-16e-instruct', 'deepseek-r1-distill-llama-70b', 'mixtral-8x7b-32768'] },
  { id: 'openai',      keyName: 'openai-api-key',      baseUrl: 'https://api.openai.com/v1',     models: ['gpt-4o-mini', 'gpt-4o'] },
]
```

### Selection logic

1. Fetch all rows from `app_config` table via `POST /get_all_app_config`.
2. Iterate the priority list in order (Mistral → Groq → OpenAI).
3. Look up the key in the map by `keyName`.
4. Use the first provider whose key exists and is non-empty.
5. Select `models[0]` as the active model.

### Adding a provider

Add an entry to `OPENAI_COMPAT_PROVIDERS` with:
- `id` — short label for logging
- `keyName` — the `app_config` key in the SQLite DB (e.g. `'anthropic-api-key'`)
- `baseUrl` — API base (must support `POST /v1/chat/completions` with Bearer auth)
- `models` — ordered list, `[0]` is used by default

### API key source

Keys are **not** read from environment variables. They come from the server's SQLite database, which is populated through the settings UI (API keys page → `set_app_config`). This matches how the running application resolves credentials.

---

## Model Behaviour by Provider

### Mistral (`mistral-large-latest`)
- Respects `depth:"deep"` parameter ✅
- Calls the research tool correctly ✅
- Returns `content` as array of blocks — test script shows `[object Object]` ⚠️
- Full tool-calling pipeline works end-to-end ✅

### Groq (`llama-3.3-70b-versatile`)
- Good tool-calling compliance ✅
- Returns clean string content ✅
- Free tier rate-limited to 100k TPD — may hit `429` ⚠️
- Fast inference (~2-3s per call) ✅

### OpenAI (`gpt-4o-mini`)
- Best tool-calling compliance ✅
- Clean string content ✅
- Requires paid key — not present in current DB ⚠️

---

## Output Format

```
=== DEEP RESEARCH END-TO-END TEST ===

Checking go-crawl...
go-crawl: REACHABLE

Fetching API keys from server DB...
Found 20 config entries in DB

=== Test 1: Direct go-crawl deep research ===
Time: 14.5s
Success: true
Results: 10 sources
  1. How AI Is Transforming Healthcare in 2026 | Wolters Kluwer
     URL: https://...
     Content: ...
Has substantive content (>200 chars): YES

✓ TEST 1 PASS

=== Test 2: LLM agent with research tool ===
API: https://api.mistral.ai | Model: mistral-large-latest

  Step 1: (no text) | Tool calls: 1
  → Tool: research
    Query: "environmental impact of electric vehicles vs hydrogen..."
    Depth: deep
    Max sources: 8
    go-crawl returned results, sending back to LLM...
  Step 2: "...synthesis text..." | Tool calls: 0

Total time: 49.2s
Steps: 2
Tool calls: 1
Response length: 305 chars

✓ TEST 2 PASS

=== RESULTS: 2 passed, 0 failed ===
```

### Pass/fail criteria

| Test | Pass condition |
|---|---|
| **1: go-crawl depth** | At least one source has markdown content >200 characters |
| **2: Agent pipeline** | LLM called the research tool (≥1 tool call) AND final response ≥200 characters |

---

## Runtime Requirements

| Requirement | Default | Notes |
|---|---|---|
| go-crawl server | `http://127.0.0.1:8080` | Must be running and able to reach DuckDuckGo |
| App server | `http://localhost:3001` | Must be running (provides config endpoint) |
| API key in DB | At least one of: `mistral-api-key`, `groq-api-key`, `openai-api-key` | Configured through settings UI |
| Node.js | ≥18 (for global `fetch`) | — |
| Network | Outbound to LLM API + DuckDuckGo (via go-crawl) | — |

---

## When to use this harness

- **After go-crawl changes** — verify the crawl backend still returns real, substantive web results
- **After provider config changes** — confirm the selected LLM actually calls the research tool
- **When debugging agent research failures** — isolate whether the problem is in the LLM (not calling the tool), go-crawl (returning empty results), or the synthesis step (tool results fed back incorrectly)
- **Before committing to the full selftest suite** — quick smoke test that the core research data plane is healthy

## When NOT to use this harness

- Testing the Effect tool runtime (`materialize`, `settle`, `ToolOutputStore`)
- Testing SSE streaming or frontend event handling
- Testing any tool other than `research`
- Testing subagent delegation or plan execution
- Performance benchmarking (single-threaded, no warmup, no statistical sampling)
