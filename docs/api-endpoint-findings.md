# API Endpoint Findings

Investigation date: 2026-06-27

## OpenCode Zen

| Item | Status |
|---|---|
| Base URL in code | `https://opencode.ai/zen/v1` |
| SDK used | `@ai-sdk/openai` → `createOpenAI()` |
| Official SDK | `@ai-sdk/openai-compatible` → `createOpenAICompatible()` |
| `/zen/v1/models` | ✅ Works — returns full model list |
| `/zen/v1/chat/completions` | ⚠️ Returns 500 without valid API key |

**Verdict:** The endpoint URL is correct for the models configured (`deepseek-v4-flash-free`, `big-pickle`, `mimo-v2.5-free`). They all map to `https://opencode.ai/zen/v1/chat/completions` per the [official Zen docs](https://opencode.ai/docs/zen/). The 500 error is due to missing or invalid API key — the server returns 500 instead of 401 when unauthorized.

**Note:** The official docs specify `@ai-sdk/openai-compatible` for these models, but code uses `@ai-sdk/openai`. Both send standard chat completions requests to the same URL, so it works functionally. Consider switching for correctness.

---

## OpenRouter

| Item | Status |
|---|---|
| Base URL in code | `https://openrouter.ai/api/v1` |
| SDK used | `@ai-sdk/openai` → `createOpenAI()` |
| `/api/v1/chat/completions` | ✅ Returns 401 (no API key) — correct behavior |

**Verdict:** Endpoint is correct. Standard OpenAI-compatible URL.

---

## Google / Groq / Mistral / Cerebras

These use their official `@ai-sdk/*` packages (`@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/mistral`, `@ai-sdk/cerebras`). Their base URLs are baked into the SDK; no user-facing configuration needed. No issues found.

---

## Backend API

| Item | Value |
|---|---|
| VITE_API_URL | `http://localhost:3001` (from `.env`) |
| Server port | `3001` (from `server/.env`) |
| Server auth | Optional `API_KEY` env var for `X-Api-Key` header |

---

## Summary

| Provider | Endpoint | SDK | Works? |
|---|---|---|---|
| OpenCode Zen | `https://opencode.ai/zen/v1/chat/completions` | `@ai-sdk/openai` (should be `@ai-sdk/openai-compatible`) | ⚠️ Needs valid API key |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | `@ai-sdk/openai` | ✅ Needs valid API key |
| Google | built-in | `@ai-sdk/google` | ✅ |
| Groq | built-in | `@ai-sdk/groq` | ✅ |
| Mistral | built-in | `@ai-sdk/mistral` | ✅ |
| Cerebras | built-in | `@ai-sdk/cerebras` | ✅ |

All endpoints are structurally correct. If OpenCode Zen models fail, ensure a valid API key is stored under `opencodezen-api-key` in localStorage (set via Settings → OpenCode Zen).
