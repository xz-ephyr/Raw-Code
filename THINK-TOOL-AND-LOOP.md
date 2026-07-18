# Think Tool & Provider-Agnostic Loop

## Status: What Already Exists

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

## What Needs to Be Built

### Step 1: Think Tool Definition
**Where:** `packages/tool-runtime/src/content/think.ts` (new file)

```typescript
import { Tool } from "../tool/make"
import { Schema } from "effect"

export const thinkTool = Tool.make({
  name: "think",
  description:
    "Use to reason step-by-step before acting, especially before calling " +
    "another tool or when re-evaluating a result. This does not perform any action.",
  inputSchema: Schema.Struct({
    thought: Schema.String,
  }),
  outputSchema: Schema.Struct({
    acknowledged: Schema.Literal("Noted."),
  }),
  execute: () => Effect.succeed({ acknowledged: "Noted." }),
})
```

**Why:** Non-reasoning models (GPT-4o, Claude Haiku, etc.) won't produce reasoning
events unless they call this tool. Native reasoning models (o3, Claude Sonnet 4)
emit `reasoning-delta` automatically — the think tool is never injected for them.

### Step 2: Think Tool Injection Logic
**Where:** `packages/llm-providers/src/adapters/think-tool-inject.ts` (new file)

```typescript
import { getModelCapability } from "@reasoning/capabilities"

export function shouldInjectThinkTool(modelId: string): boolean {
  const cap = getModelCapability(modelId)
  return cap.reasoning === "none"
}

export function injectThinkToolIfNeeded(modelId: string, tools: ToolDef[]): ToolDef[] {
  if (!shouldInjectThinkTool(modelId)) return tools
  if (tools.some(t => t.name === "think")) return tools
  return [...tools, thinkToolDefinition]
}
```

**Why:** When the tool loop starts, check the model's capability. If it has no native
reasoning, inject the `think` tool automatically. This lives in the adapter layer,
not in the app.

### Step 3: Think Tool Interception
**Where:** Inside `packages/llm-providers/src/adapters/tool-loop.ts` (modify existing)

In the tool loop executor, intercept `think` calls before sending to the real executor:

```typescript
const wrappedExecutor: ToolExecutor = (call) => {
  if (call.name === "think") {
    // Emit the thought as a reasoning event (same as native reasoning)
    // No-op result — don't actually execute
    return Effect.succeed({ id: call.id, name: call.name, result: "Noted." })
  }
  return executor(call)
}
```

And emit the thought content as a `reasoning-delta` event so the UI treats it
identically to native reasoning:

```typescript
if (call.name === "think") {
  const thought = (call.input as any)?.thought ?? ""
  // Emit reasoning-start/delta/end to match native reasoning format
  emit({ type: "reasoning-start", id: call.id })
  emit({ type: "reasoning-delta", id: call.id, text: thought })
  emit({ type: "reasoning-end", id: call.id })
}
```

**Why:** The UI already knows how to render `reasoning-delta` events. By mapping
`think` tool calls into the same event type, the thinking panel works identically
for native and non-native reasoning.

### Step 4: Loop Safety Enhancements
**Where:** `packages/llm-providers/src/adapters/tool-loop.ts` (modify existing)

Add to `ToolLoopConfig`:
```typescript
export interface ToolLoopConfig {
  readonly routes: ReadonlyArray<AnyRoute>
  readonly maxSteps?: number           // already exists (default 10)
  readonly maxTokens?: number          // NEW: per-request token budget
  readonly timeoutMs?: number          // NEW: overall request timeout
  readonly abortSignal?: AbortSignal   // already exists
}
```

Add repeated-identical-call detector inside the loop:
```typescript
const lastCall = toolCalls[toolCalls.length - 1]
if (lastCall && lastCall.name === prevCall?.name &&
    JSON.stringify(lastCall.input) === JSON.stringify(prevCall?.input)) {
  // Stuck in a loop — break
  break
}
```

Add token budget check before each provider call:
```typescript
if (totalTokens > config.maxTokens) {
  // Emit warning, break loop
}
```

Add overall timeout:
```typescript
const deadline = Date.now() + (config.timeoutMs ?? 120_000)
// Check before each step
if (Date.now() > deadline) break
```

### Step 5: SourceAgentId for Multi-Agent Mode
**Where:** `packages/llm-providers/src/schema/event-schemas.ts` (modify existing)

Add optional `sourceAgentId` field to `LLMEvent` union members:

```typescript
export const LLMEvent = Schema.Union(
  // ... existing schemas, each gets:
  Schema.Struct({
    type: Schema.tag("text-delta"),
    id: ContentBlockID,
    text: Schema.String,
    sourceAgentId: Schema.optional(Schema.String),  // NEW
  }),
  // ... same for reasoning-delta, tool-call, tool-result, etc.
)
```

This is backwards-compatible — existing code ignores the field if not set.

### Step 6: Wire Everything Together
**Where:** `server/src/routes/llm-stream.ts` and `server/src/antigravity/runtime.ts`

Both use `createToolLoop()` already. Changes needed:
1. Import and pass `thinkTool` injection logic
2. Add token budget and timeout to config
3. The `sourceAgentId` gets threaded through `ToolLoopConfig` → executor context

---

## Where NOT to Duplicate Code

| Concern | Location | Why |
|---------|----------|-----|
| Event schema | `packages/llm-providers/src/schema/event-schemas.ts` | Single source of truth — all providers emit here |
| Tool loop | `packages/llm-providers/src/adapters/tool-loop.ts` | Already used by both server routes — modify once |
| Think tool definition | `packages/tool-runtime/src/content/think.ts` | Reusable across all entry points |
| Think tool injection | `packages/llm-providers/src/adapters/think-tool-inject.ts` | Adapter-layer concern, not app concern |
| Model capabilities | `core/reasoning/capabilities.ts` | Already exists — just query it |
| SSE mapping | `server/src/antigravity/runtime.ts` | Already maps `reasoning-delta` → `thinking_delta` |
| Frontend thinking panel | `src/components/ai/reasoning.tsx` | Already consumes `reasoning-delta` — no changes needed |

**Key insight:** The entire "think tool + normalization" lives inside `packages/llm-providers`.
The frontend never needs to know whether reasoning came from a native provider or the
think tool — it just sees `reasoning-delta` events either way.

---

## Dependency Order

```
Step 1 (think tool def) → Step 2 (injection logic) → Step 3 (interception in loop)
                                                        ↓
Step 4 (loop safety) ← depends on Step 3 for repeated-call detector
                                                        ↓
Step 5 (sourceAgentId) ← independent, can be done anytime
                                                        ↓
Step 6 (wiring) ← depends on all above
```

Steps 1-3 are the core feature. Step 4 is safety hardening. Step 5 is multi-agent
prep. Step 6 is integration.
