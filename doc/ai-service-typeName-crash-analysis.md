# `typeName` Crash Analysis — `aiService.ts:270`

## Error

```
AI stream failed for openai/gpt-oss-safeguard-20b:
  Cannot read properties of undefined (reading 'typeName')
```

Stack: `(anonymous) @ aiService.ts:270` → `transform @ chunk-BVOD3U7M.js:10075`

---

## Root Cause Chain

### 1. Invalid Groq API key

The model `openai/gpt-oss-safeguard-20b` has `provider: 'groq'` (`models.ts:36`).  
The user has a Groq key set but it's expired/invalid — every Groq API call returns **401**.

### 2. `buildFallbackChain` cannot detect invalid keys

`buildFallbackChain()` filters out providers with **empty** keys (`configuredProviders.has(def.provider)`), but it has no way to tell a valid key from an invalid one. So Groq models still enter the fallback chain.

### 3. `contextContractor.ts` sees the 401 first

`contextContractor.ts:22` calls `generateText()` with the Groq model → 401 → caught at line 44. Error logged, fallback returned (`messages.slice(-10)`).

### 4. `chatCompletion()` calls `streamText()` → Groq 401 again

`chatCompletion()` at `aiService.ts:240` calls `streamText()` with the same Groq model. The API returns 401 immediately.

### 5. AI SDK v5 choke on non-streaming error response

The AI SDK v5 expects a valid streaming response. When it receives a 401 JSON body instead, its internal `transform` pipeline (at `chunk-BVOD3U7M.js:10075`) tries to parse it as a stream chunk. It encounters an `undefined` value where it expects `.typeName` on a response object → `TypeError`.

### 6. The `try/catch` misses it

The `try/catch` at line 273 surrounds the `streamText()` **setup** — but `streamText()` returns a Promise that resolves to a `StreamResult`. The error happens **asynchronously** during response parsing, so the `catch` doesn't fire. Instead, the SDK passes the error to the `onError` callback at line 269, which logs it at line 270.

---

## Files Involved

| File | Role |
|---|---|
| `core/models/aiService.ts` | `chatCompletion()`, `getLanguageModel()`, fallback chain — crash site |
| `core/memory/contextContractor.ts` | First Groq 401 hit — caught, logs error |
| `core/config/models.ts` | Model definitions — `openai/gpt-oss-safeguard-20b` uses `provider: 'groq'` |

---

## Fix Options

| Option | Effort | Notes |
|---|---|---|
| **A. Validate API keys on save** (try a cheap endpoint call) | Medium | Prevents invalid keys from being saved, catches the issue at source |
| **B. Wrap stream consumption with error handling** | Low | Prevent crash even when an API returns garbage — defensive fix |
| **C. Add per-provider key validation helper** | Medium | A `testProviderKey(provider)` that makes a minimal API call to verify before adding to fallback chain |
| **D. Filter Groq models from fallback when Groq key is invalid** | Low | Quick patch — detect Groq 401 once and exclude all Groq models from the chain for that session |
| **E. Upgrade/reconfigure AI SDK stream error handling** | High | SDK-level change — not recommended unless the SDK itself has a known fix |

Recommended route: **A + B** — validate on save so the user knows immediately, and add a defensive guard around stream consumption to survive unexpected API responses.
