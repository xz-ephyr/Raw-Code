# `aiService.ts:270` — AI stream fails with `typeName` null-safety bug

## Observed error

```
aiService.ts:270 AI stream failed for gemma-4-26b-a4b-it:
  Cannot read properties of undefined (reading 'typeName')
```

## Root cause

Two interacting issues:

### 1. Missing / invalid API key (primary cause)

```
POST https://api.groq.com/openai/v1/chat/completions 401 (Unauthorized)
contextContractor.ts:44 Context contraction failed: AI_APICallError: Invalid API Key
```

The Groq API key stored in the app is either missing, expired, or incorrect. The `@ai-sdk/groq` SDK sends the request with an invalid key and gets a `401`.

### 2. SDK null-safety bug (secondary cause)

When `@ai-sdk/groq` receives a `401`, it tries to parse the error response and accesses `.typeName` on an undefined object — producing:

```
TypeError: Cannot read properties of undefined (reading 'typeName')
```

This is a defensive-coding gap inside the SDK (`node_modules/@ai-sdk/groq`). The SDK assumes the error response body has a `.typeName` property, but a `401` response body may lack it or be `undefined`.

## Why fallback doesn't work

The `streamText` call at **`core/models/aiService.ts:240`** receives the SDK's internal `TypeError` in its `onError` callback (line 269–271):

```ts
onError({ error }) {
  console.error(`AI stream failed for ${currentModelName}:`, getAIErrorMessage(error));
},
```

The `onError` callback **only logs** — it does **not throw**. The AI SDK's `streamText` catches the error internally, fires `onError`, but then **returns a broken/errored stream** instead of rejecting the promise.

Because `streamText` doesn't reject, the outer `try/catch` at line 273 **never executes**, and the fallback loop never advances to the next model. The caller receives a broken stream and shows "Chat stream failed."

## File locations

| File | Role |
|---|---|
| `core/models/aiService.ts:240` | `streamText` call |
| `core/models/aiService.ts:269–271` | `onError` handler (line 270 in error trace) |
| `core/models/aiService.ts:273` | Outer `catch` — never reached |
| `core/models/aiService.ts:89–98` | `getAIErrorMessage` helper |
| `core/memory/contextContractor.ts:22` | Context contraction also fails with 401 |

## Proposed fix

### A. Validate API key before calling `streamText`

Add a guard inside the `chatCompletion` loop (before `streamText`) to check that the current model's provider API key is configured. If missing, throw immediately so the outer `catch` triggers the fallback:

```ts
// Inside the for-loop, before streamText()
if (def && !getConfiguredProviderKey(def.provider)) {
  throw new Error(`No API key configured for provider "${def.provider}" (model: ${currentModelName})`);
}
```

### B. Exclude primary model from chain when its provider has no key

In `buildFallbackChain`, currently only *fallback* models are filtered by `configuredProviders`. Extend the filter to also exclude the `primaryModelName` if its provider has no key. This prevents even attempting the primary model.

### C. Make `getAIErrorMessage` more defensive

The `error` object passed to `onError` may be malformed. Add optional chaining at line 92:

```ts
if (error instanceof Error) return error.message;
// → already safe, but could guard:
if (error instanceof Error) return error?.message ?? 'Unknown error';
```

### D. (Optional) Throw from `onError` as a safety net

If the API key check somehow passes but the SDK still encounters an internal error, throwing from `onError` ensures the outer `catch` always fires:

```ts
onError({ error }) {
  console.error(`AI stream failed for ${currentModelName}:`, getAIErrorMessage(error));
  throw error; // <--- triggers outer catch → fallback
},
```

This makes the fallback mechanism reliable regardless of SDK internals.

## Dependencies

| Package | Version (inferred) | Issue |
|---|---|---|
| `ai` (Vercel AI SDK) | latest (via import) | `streamText` doesn't throw after `onError` |
| `@ai-sdk/groq` | latest | Accesses `.typeName` on undefined on 401 error |
