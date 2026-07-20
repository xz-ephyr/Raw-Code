# Unified Reasoning UX — End-to-End Implementation Plan

## Validated User Intent

**Surface:** "Make the think tool and reasoning events work end-to-end and show in the UI frontend."

**Latent Goals:**
1. Unified reasoning UX regardless of model type — native reasoning (o3, Claude Sonnet 4), tagged reasoning (Gemma, Qwen), and think-tool reasoning (GPT-4o, Llama) should all produce visible reasoning
2. No manual toggle required — reasoning should work transparently when the model produces it
3. Clean UX — the think tool is a mechanism, not a user-visible feature; its tool calls should be hidden from the action timeline

---

## Root Cause Analysis

The backend (tool-loop, think tool injection, event schema) is complete. The frontend has **three critical gaps**:

| Gap | File | Problem |
|-----|------|---------|
| **GAP 1** | `core/models/nativeChatCompletion.ts` | Browser path never calls `injectThinkTool()` — non-reasoning models can't produce reasoning |
| **GAP 2** | `src/services/ChatStreamService.ts` + `src/lib/llmEventReducer.ts` | `isThinkingEnabled` defaults to `false`, causing `skipReason = true` which discards ALL reasoning events |
| **GAP 3** | `packages/llm-providers/src/adapters/tool-loop.ts` | Think tool's `tool-call`/`tool-result` events leak into action timeline as "Running think..." noise |

---

## Engineering Approach

**Principle: Separate collection from display.**

- **Collection:** Always on. Every model's reasoning events are accumulated regardless of any toggle. This ensures stored messages have reasoning data and tagged models get inline scanning.
- **Display:** Show the reasoning panel when `reasoning` is truthy. No empty panels during streaming. The `(isThinkingEnabled && isStreaming)` workaround is removed.
- **Filtering:** Think tool artifacts are filtered at the source (`tool-loop.ts`), not in the reducer. The reducer shouldn't know about think tool semantics.

---

## File-by-File Change Plan

### Change 1: `core/models/nativeChatCompletion.ts` — Inject Think Tool

**Why:** This is the browser-side entry point for LLM calls. It builds tool definitions but never calls `injectThinkTool()`. The server path already does this correctly.

**Changes:**
- Import `injectThinkTool` from `@doktor/llm-providers/adapters/think-tool-inject`
- Import `getModelCapability` from `@core/reasoning/capabilities`
- After `materialize()`, check model capability and inject think tool for non-reasoning models

**Before:**
```ts
const mat = materialize()
const toolDefs = mat.definitions.map((d) =>
  makeToolDefinition({ name: d.name, description: d.description, inputSchema: d.inputSchema }),
)
```

**After:**
```ts
const mat = materialize()
const baseToolDefs = mat.definitions.map((d) =>
  makeToolDefinition({ name: d.name, description: d.description, inputSchema: d.inputSchema }),
)
const capability = getModelCapability(input.modelName)
const needsThinkTool = capability.reasoning === 'none'
const toolDefs = injectThinkTool(baseToolDefs, needsThinkTool)
```

---

### Change 2: `packages/llm-providers/src/adapters/tool-loop.ts` — Filter Think Tool Events

**Why:** The think tool's `tool-call` and `tool-result` events leak into the output stream, causing "Running think..." in the action timeline. Filter at the source.

**Changes:**
- After defining `isThinkCall`, create `filteredEvents` that excludes `tool-call` events for think calls
- Filter `toolResults` to exclude think tool results from output

**Before:**
```ts
return Stream.fromIterable([
  ...events.filter((e) => e.type !== "finish"),
  ...thinkReasoningEvents,
  ...toolResults,
]).pipe(Stream.concat(rest))
```

**After:**
```ts
 const thinkIds = new Set(toolCalls.filter(isThinkCall).map(tc => tc.id))
 return Stream.fromIterable([
   ...events.filter((e) => {
     if (e.type === "finish") return false
     if ((e.type === "tool-call") && thinkIds.has((e as ToolCall_).id)) return false
     return true
   }),
   ...thinkReasoningEvents,
   ...toolResults.filter((tr) => !thinkIds.has(tr.id)),
 ]).pipe(Stream.concat(rest))
```

---

### Change 3: `src/services/ChatStreamService.ts` — Remove skipReason

**Why:** `skipReason` gates both inline tag scanning and reasoning accumulation. Removing it makes reasoning always collected.

**Changes:**
- Remove `isThinkingEnabled` from `StreamConfig` interface
- Remove `skipReason` computation (line 166)
- Remove `!skipReason` gate from tag scanner (line 169)
- Remove `skipReasoning` option from `reduceEvent` calls (lines 189, 195)

---

### Change 4: `src/lib/llmEventReducer.ts` — Remove skipReasoning

**Why:** The reducer's `skipReasoning` parameter suppresses `reasoning-delta` events and strips reasoning on finish. Removing it makes the reducer always pass through reasoning.

**Changes:**
- Remove `skipReasoning` parameter from `reduceEvent` signature
- Remove early return for `skipReasoning` in `reasoning-delta` handler
- Remove `skipReasoning` block in `finish` handler

---

### Change 5: `src/components/chat/AssistantBubble.tsx` — Simplify Reasoning Gate

**Why:** Line 178 gates reasoning on `(reasoning || (isThinkingEnabled && isStreaming))`. The second branch creates empty panels. Simplify to just `reasoning`.

**Changes:**
- Line 178: `{(reasoning || (isThinkingEnabled && isStreaming)) && (` → `{reasoning && (`
- Remove `isThinkingEnabled` from props interface (optional cleanup)

---

### Change 6: `src/stores/projectStore.ts` — Default to True

**Why:** `isThinkingEnabled` defaults to `false`. Even though filtering is removed, keeping the state at `true` prevents stale references from breaking.

**Changes:**
- Line 23: `isThinkingEnabled: false` → `isThinkingEnabled: true`

---

### Change 7: `src/hooks/useChatPage.ts` — Remove from Stream Config

**Why:** Passes `isThinkingEnabled` to `ChatStreamService.start()`. Since `StreamConfig.isThinkingEnabled` is being removed, this line must be updated.

**Changes:**
- Line 286: Remove `isThinkingEnabled: isThinkingEnabledRef.current`

---

### Change 8: `src/components/chat/ToolbarDropdown.tsx` — Remove Toggle UI

**Why:** The reasoning toggle is misleading since reasoning is always-on. Remove the toggle row.

**Changes:**
- Remove the reasoning toggle `<div>` (lines 61-70)
- Remove `isThinkingEnabled` and `onToggleThinking` from props

---

### Change 9: `src/components/chat/ChatInput.tsx` — Remove showThinkingOnly

**Why:** Passes `isThinkingEnabled` to `ModelList` as `showThinkingOnly`. With reasoning always-on, filtering the model list is no longer meaningful.

**Changes:**
- Line 160: Remove `showThinkingOnly={isThinkingEnabled}` prop

---

## Execution Order

1. Change 4 (llmEventReducer) — Remove skipReasoning parameter
2. Change 3 (ChatStreamService) — Remove skipReason logic
3. Change 1 (nativeChatCompletion) — Inject think tool
4. Change 2 (tool-loop) — Filter think tool from output
5. Change 5 (AssistantBubble) — Simplify reasoning gate
6. Change 6 (projectStore) — Default to true
7. Change 7 (useChatPage) — Remove from stream config
8. Change 8 (ToolbarDropdown) — Remove toggle UI
9. Change 9 (ChatInput) — Remove showThinkingOnly

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Native reasoning double-counting | LOW | Native models don't use inline tags; scanner is null for them |
| Think tool performance | LOW | Think tool is a no-op; events are filtered at source |
| Toggle removal breaks saved state | LOW | `isThinkingEnabled` kept in store at `true`; existing refs continue to work |
| Backwards compat for stored messages | NONE | `toUIMessage()` already extracts reasoning from inline tags as fallback |

---

## Testing Strategy

1. **Type check:** `npx tsc --noEmit` from repo root and server/
2. **Manual verification:**
   - Native reasoning model (o3): reasoning panel appears during streaming
   - Think-tool model (GPT-4o): reasoning panel appears via think tool
   - Tagged model (Gemma): reasoning panel appears via inline tags
   - Think tool calls do NOT appear in action timeline
   - All models shown in model selector
3. **Existing tests:** Run all adapter tests to verify no regressions

---

## Recommendation

Proceed with implementation. The changes are surgical, minimal, and backwards-compatible. The total diff is approximately 9 files with ~50 lines changed. No new dependencies, no new components, no architectural changes.
