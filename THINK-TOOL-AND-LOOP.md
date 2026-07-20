# Think Tool & Provider-Agnostic Loop

## Status: DONE

All 6 steps implemented. 65/65 tests pass across 7 test suites.

### LLMEvent Schema (DONE - `packages/llm-providers/src/schema/event-schemas.ts`)
- `reasoning-start`, `reasoning-delta`, `reasoning-end` — already used for native reasoning
- `tool-call`, `tool-result`, `tool-error` — tool lifecycle events
- `text-delta`, `text-start`, `text-end` — answer text events
- `step-start`, `step-finish`, `finish`, `usage` — loop lifecycle
- No new schema types needed — the existing events already cover everything

### Provider Adapters (DONE - `packages/llm-providers/src/adapters/`)
- `openai-adapter.ts` — OpenAI/SSE streaming with protocol state machine
- `anthropic-adapter.ts` — Anthropic/SSE streaming
- `resumable-adapter.ts` — Event persistence decorator for stream resumption
- `with-retry.ts` — Exponential backoff retry decorator
- `smooth.ts` — Stream smoothing for UI
- `orchestrator.ts` — Tool loop wrapper with `maxSteps` guard

### Tool Loop (DONE - `packages/llm-providers/src/adapters/tool-loop.ts`)
- `createToolLoop({ routes, maxSteps })` — already loops, executes tools, recurses
- Missing: token budget, repeated call detector, timeout

### Protocol-Level Reasoning (DONE)
- `protocols/openai-chat.ts` — handles `delta.reasoning_content` → emits `reasoning-delta`
- `protocols/anthropic-messages.ts` — handles `thinking` blocks → emits `reasoning-delta`
- Both already normalize native reasoning into the same event type

### Model Capabilities (DONE - `core/reasoning/capabilities.ts`)
- `MODEL_CAPABILITIES` registry maps every model to `{ reasoning: 'native' | 'tagged' | 'none' }`
- `getModelCapability(modelId)` — lookup helper

### Inline Tag Scanner (DONE - `core/reasoning/inline-scanner.ts`)
- `createInlineScanner()` — extracts reasoning from `<thought>`/`</think>` tags in streaming text
- Used for Gemma, Qwen models with `tagged` reasoning mode

### SSE Mapping (DONE - `server/src/antigravity/runtime.ts`)
- `toAntigravityEvent()` already maps `reasoning-delta` → `thinking_delta` for frontend

### Frontend Consumption (DONE - `src/hooks/useLLMEventStream.ts`)
- React hook processes `LLMEvent` stream with `reduceEvent()` state machine
- Reasoning UI components exist: `src/components/ai/reasoning.tsx`

---

## What Was Built

### Step 1: Think Tool Definition ✅
**File:** `packages/tool-runtime/src/content/think.ts`

Think tool with `thought` input schema and `Noted.` acknowledgement output. Registered in `packages/tool-runtime/src/content/index.ts`.

**Test:** `packages/tool-runtime/src/content/think.test.ts` — 6 tests

### Step 2: Think Tool Injection Logic ✅
**File:** `packages/llm-providers/src/adapters/think-tool-inject.ts`

`injectThinkTool(tools, needsThinkTool)` — adds think tool to tool list for non-reasoning models. Idempotent (won't duplicate).

**Test:** `packages/llm-providers/src/adapters/think-tool-inject.test.ts` — 8 tests

### Step 3: Think Tool Interception ✅
**File:** `packages/llm-providers/src/adapters/tool-loop.ts` (modified)

Intercepts `think` calls in the tool loop executor, emits `reasoning-start/delta/end` events, returns no-op result. Think calls never reach the real executor.

**Test:** `packages/llm-providers/src/adapters/think-intercept.test.ts` — 7 tests

### Step 4: Loop Safety Enhancements ✅
**File:** `packages/llm-providers/src/adapters/tool-loop.ts` (modified)

Added to `ToolLoopConfig`:
- `maxTokens` — per-request token budget (checked against `finish.usage.totalTokens`)
- `timeoutMs` — overall request timeout (checked against `Date.now()` deadline)
- Repeated identical call detector — same name+input twice → break with `repeated-call` reason

New `FinishReason` values: `"timeout"`, `"token-budget"`, `"repeated-call"` (in `ids.ts`)

**Test:** `packages/llm-providers/src/adapters/loop-safety.test.ts` — 11 tests

### Step 5: SourceAgentId Field ✅
**File:** `packages/llm-providers/src/schema/event-schemas.ts` (modified)

Added optional `sourceAgentId: Schema.optional(Schema.String)` to all 18 LLMEvent schema types. Backwards-compatible — existing code ignores the field if not set.

**Test:** `packages/llm-providers/src/schema/source-agent-id.test.ts` — 14 tests

### Step 6: Server Route Wiring ✅
**Files:** `server/src/routes/llm-stream.ts`, `server/src/antigravity/runtime.ts` (modified)

Both server routes now:
1. Look up `getModelCapability(modelId)` to determine if think tool is needed
2. Call `injectThinkTool(baseToolDefs, needsThinkTool)` before creating the request
3. Pass `maxSteps: 15, timeoutMs: 120_000` to `createToolLoop()`

Added `@core/*` path alias to `server/tsconfig.json`.

**Test:** `server/src/routes/llm-stream-wiring.test.ts` — 10 tests

### Bug Fix: `inputJsonSchema` Storage
**File:** `packages/tool-runtime/src/tool/make.ts` (modified)

Fixed pre-existing bug where `make()` didn't store `inputJsonSchema` from config onto the runtime object. This affected all tools using `inputJsonSchema` (e.g., `questionTool`).

---

## Where NOT to Duplicate Code

| Concern | Location | Status |
|---------|----------|--------|
| Event schema | `packages/llm-providers/src/schema/event-schemas.ts` | ✅ Extended with `sourceAgentId` |
| Tool loop | `packages/llm-providers/src/adapters/tool-loop.ts` | ✅ Extended with think interception + safety |
| Think tool definition | `packages/tool-runtime/src/content/think.ts` | ✅ New |
| Think tool injection | `packages/llm-providers/src/adapters/think-tool-inject.ts` | ✅ New |
| Model capabilities | `core/reasoning/capabilities.ts` | ✅ Already existed |
| SSE mapping | `server/src/antigravity/runtime.ts` | ✅ Already maps `reasoning-delta` → `thinking_delta` |
| Frontend thinking panel | `src/components/ai/reasoning.tsx` | ✅ Already consumes `reasoning-delta` — no changes needed |

**Key insight:** The entire "think tool + normalization" lives inside `packages/llm-providers`.
The frontend never needs to know whether reasoning came from a native provider or the
think tool — it just sees `reasoning-delta` events either way.

---

## Test Summary

| Test Suite | File | Tests | Status |
|-----------|------|-------|--------|
| thinkTool | `packages/tool-runtime/src/content/think.test.ts` | 6 | ✅ Pass |
| injectThinkTool | `packages/llm-providers/src/adapters/think-tool-inject.test.ts` | 8 | ✅ Pass |
| ToolLoop - think interception | `packages/llm-providers/src/adapters/think-intercept.test.ts` | 7 | ✅ Pass |
| ToolLoop - safety | `packages/llm-providers/src/adapters/loop-safety.test.ts` | 11 | ✅ Pass |
| LLMEvent - sourceAgentId | `packages/llm-providers/src/schema/source-agent-id.test.ts` | 14 | ✅ Pass |
| Orchestrator (existing) | `packages/llm-providers/src/adapters/orchestrator.test.ts` | 9 | ✅ Pass |
| Server wiring | `server/src/routes/llm-stream-wiring.test.ts` | 10 | ✅ Pass |
| **Total** | | **65** | **✅ All Pass** |

## Files Modified

| File | Change |
|------|--------|
| `packages/tool-runtime/src/content/think.ts` | **NEW** — Think tool definition |
| `packages/tool-runtime/src/content/index.ts` | Added `thinkTool` export |
| `packages/tool-runtime/src/tool/make.ts` | Fixed `inputJsonSchema` not being stored |
| `packages/llm-providers/src/adapters/think-tool-inject.ts` | **NEW** — Think tool injection logic |
| `packages/llm-providers/src/adapters/tool-loop.ts` | Think interception + safety enhancements |
| `packages/llm-providers/src/schema/ids.ts` | Added `timeout`, `token-budget`, `repeated-call` to `FinishReason` |
| `packages/llm-providers/src/schema/event-schemas.ts` | Added `sourceAgentId` to all 18 event types |
| `server/src/routes/llm-stream.ts` | Wired think tool injection + safety configs |
| `server/src/antigravity/runtime.ts` | Wired think tool injection + safety configs |
| `server/tsconfig.json` | Added `@core/*` path alias |
