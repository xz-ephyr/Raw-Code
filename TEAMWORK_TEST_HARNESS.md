# Teamwork Real-Tasks Test Harness

## Overview

`tests/selftest/layers/teamwork-real-tasks.ts` — a **real-execution** test layer that runs 10 tasks against a live LLM (Mistral `mistral-small-latest` by default) using the exact same code path as the frontend input box (`subagent_run` / `compose_run` bridge tools).

**Purpose**: Validate the entire teamwork pipeline end-to-end with real API calls, catching regressions in orchestration, tool calling, synthesis, and rate-limit handling.

---

## Quick Start

```bash
# Run the full suite (requires API keys in server/data/doktor.db)
npm run selftest -- --full --layer teamwork-real-tasks

# Run with debug logging
LLM_DEBUG=1 npm run selftest -- --full --layer teamwork-real-tasks
```

**Expected runtime**: ~60–90 seconds (10 tasks, paced at 3s intervals to respect rate limits).

---

## Test Matrix (10 Tasks)

| ID | Mode | Description | Agent(s) | Assertions |
|----|------|-------------|----------|------------|
| `T1-single-factual` | single | Capital of Australia | general | Must contain "canberra"; not "sydney"/"melbourne" |
| `T2-single-math` | single | 17 × 24 | general | Exact "408" |
| `T3-parallel` | parallel | Apollo 11 year / Au symbol / Hamlet author | 3× general | All 3 facts in merged output |
| `T4-parallel-conflict` | parallel | Two large planets | 2× general | Contains "jupiter" (duplicates OK) |
| `T5-compose-research-write` | compose | Explore → Writer (walking benefits) | explore → writer | Contains health keywords; ≥40 chars |
| `T6-compose-explore-writer` | compose | Explore → Writer (renewable energy) | explore → writer | Contains "solar", "wind" |
| `T7-single-classification` | single | Sentiment of "I love this product" | general | Contains "positive" |
| `T8-parallel-languages` | parallel | Translate "thank you" to ES/FR | 2× general | Contains "gracias", "merci" |
| `T9-compose-summary` | compose | Writer → Writer (books chain) | writer → writer | Contains "book"; ≥20 chars |
| `T10-single-error-recover` | single | Squaring the circle impossibility | general | Contains "cannot"/"impossible" |

---

## Configuration

### Model Selection (in `buildTasks()`)

```typescript
const MODEL = 'mistral-small-latest';  // Default — has key in DB, generous free tier
```

**Supported models** (from `packages/llm-providers/src/providers/model-routes.ts`):
| Model | Provider | Key Env | Notes |
|-------|----------|---------|-------|
| `mistral-small-latest` | Mistral | `MISTRAL_API_KEY` | **Default** — 60 RPM free tier |
| `llama-3.3-70b-versatile` | Groq | `GROQ_API_KEY` | 12k TPM — tight for 10 tasks |
| `gemini-2.5-flash` | Google | `GOOGLE_API_KEY` | Requires billing |
| `gpt-4o-mini` | OpenAI | `OPENAI_API_KEY` | Requires billing |
| `claude-sonnet-4` | Anthropic | `ANTHROPIC_API_KEY` | Requires billing |

**To change**: Edit `MODEL` constant in `buildTasks()` or pass via `model` field in task input.

---

### API Key Loading

Keys are read from `server/data/doktor.db` → `app_config` table at runtime:

```typescript
const envMap = {
  'groq-api-key': 'GROQ_API_KEY',
  'mistral-api-key': 'MISTRAL_API_KEY',
  'google-api-key': 'GOOGLE_API_KEY',
  // ...
};
```

**Required**: At least `MISTRAL_API_KEY` (or whichever model you select) must have a non-empty value in the DB.

---

### Rate Limit Pacing

```typescript
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < tasks.length; i++) {
  if (i > 0) await sleep(3000);  // 3s between tasks
  // ...
}
```

**Adjust for your provider**:
- Mistral free tier: 60 RPM → 3s gap is safe
- Groq free tier: 12k TPM → need ~5s+ gap for 10 tasks
- Paid tiers: can reduce to 1–2s

---

## Capabilities Tested

| Capability | How It's Exercised |
|------------|-------------------|
| **Single sub-agent** | T1, T2, T7, T10 |
| **Parallel sub-agents** | T3, T4, T8 (via `tasks: []` array) |
| **Compose pipeline** | T5, T6, T9 (multi-step with `{{interpolation}}`) |
| **Agent personalities** | `general`, `explore`, `writer` used |
| **Tool scope restriction** | Compose steps use `toolScope: ['question']` |
| **Result synthesis** | Parallel tasks merged via `synthesize()` |
| **Tool execution** | Researcher calls `research_compile` (deep) |
| **Rate-limit retry** | 429 handled by `withRetry` (5 retries, backoff) |
| **Golden snapshots** | Outputs hashed; drift detected on re-run |

---

## Limits & Known Constraints

| Limit | Detail |
|-------|--------|
| **No streaming chat text from researcher** | Researcher output is in `tool_call_end` events, not `text-delta`. Frontend must listen to tool events. |
| **Mistral only for CI** | Other models need their API keys populated in DB. |
| **Go-crawl required for deep research** | `research_compile` hits `localhost:8080`. If unavailable, falls back to mock (30s timeout). |
| **Max parallel sub-agents = 5** | Hard-coded in `packages/subagent/src/scheduler.ts:24` |
| **Max steps per sub-agent** | Personality defaults (10–20); override via `maxSteps` |
| **No cross-session rate limiting** | Each test run gets its own 5× retry budget; concurrent runs may compound 429s |
| **Golden drift = FAIL** | If output hash changes, test fails. Update by deleting `teamwork-golden.json`. |

---

## Output Artifacts

| File | Purpose |
|------|---------|
| `tests/selftest/layers/teamwork-golden.json` | `{ taskId: { output, hash } }` — exact outputs for regression detection |
| `tests/selftest/last-run.md` | Markdown scorecard (all layers) |
| `tests/selftest/history.jsonl` | JSONL history of runs |

---

## Debugging Failures

### Common Failure Modes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `output: ""` (empty) | Model returned only tool calls, no text | Check `toolResults` in bridge return; researcher/writer produce artifacts not chat text |
| `Rate limit reached` after retries | Provider quota exhausted | Wait, add delay, or use paid tier |
| `go-crawl search failed` | Crawler not running | Start `npm run crawler` or accept mock fallback |
| `toolResults: []` | Bridge not returning tool results | Ensure `subagent.ts` collects `tool-result` events |
| Golden drift | Model output changed | Delete `teamwork-golden.json` to re-baseline |

### Enable Debug Logs

```bash
LLM_DEBUG=1 npm run selftest -- --full --layer teamwork-real-tasks
```

Shows: `[fetch] URL`, `[provider] HTTP 429`, `[render] endpoint`.

---

## Extending the Suite

### Add a New Task

```typescript
{
  id: 'T11-custom-name',
  mode: 'single',           // or 'parallel' | 'compose'
  description: 'Human-readable description',
  run: async () => bridge.subagent({  // or bridge.compose
    task: 'Your task prompt',
    agentType: 'general',   // or 'explore'|'writer'|'researcher'|'video'
    model: MODEL,
    toolScope: [],          // optional
    maxSteps: 10,           // optional
  }),
  mustContain: ['required', 'keywords'],
  mustNotContain: ['forbidden', 'words'],
  minLength: 50,
  rubric: (output) => output.includes('specific phrase') ? null : 'missing phrase',
}
```

### Add a Compose Pipeline

```typescript
run: async () => bridge.compose({
  initialContext: 'Topic',
  model: MODEL,
  steps: [
    { name: 'step1', agentType: 'researcher', taskTemplate: 'Research {{__initial__}}' },
    { name: 'step2', agentType: 'writer', taskTemplate: 'Write based on {{step1}}', toolScope: ['question'] },
  ],
})
```

---

## CI Integration

```yaml
# .github/workflows/teamwork-test.yml
jobs:
  teamwork-real:
    runs-on: ubuntu-latest
    env:
      # Populate from GitHub Secrets
      MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run selftest -- --full --layer teamwork-real-tasks
```

**Note**: The DB (`server/data/doktor.db`) is committed. If keys rotate, update the DB or inject via env at runtime.

---

## Related Files

| File | Role |
|------|------|
| `tests/selftest/layers/teamwork-real-tasks.ts` | Harness |
| `tests/selftest/run.ts` | Runner entry |
| `packages/subagent/src/bridge.ts` | `subagent_run` / `compose_run` tools |
| `packages/subagent/src/subagent.ts` | Core sub-agent loop |
| `packages/subagent/src/scheduler.ts` | Parallel execution |
| `packages/subagent/src/composer.ts` | Pipeline interpolation |
| `packages/llm-providers/src/adapters/tool-loop.ts` | Retry logic |
| `packages/llm-providers/src/route/transport/http.ts` | 429 handling |
| `packages/tool-runtime/src/content/research.ts` | Deep research tool |
| `packages/tool-runtime/src/content/research-compile.ts` | Multi-source research |

---

## Last Verified

- **Date**: 2026-07-17
- **Run**: `npm run selftest -- --full --layer teamwork-real-tasks`
- **Result**: ✅ 10/10 pass
- **Model**: Mistral `mistral-small-latest`
- **Duration**: ~68s