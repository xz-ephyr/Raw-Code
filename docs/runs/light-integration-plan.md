# Light Integration Plan: LLM-Providers Into Chat

## 1. ReasoningPanel — Tying Into the Existing Animation

### What exists already
- `ThinkingAnimation.tsx` — cycles through 20 random words ("Disentangling", "Extrapolating" etc) every 2s
- `useThinkingTimer.ts` — elapsed-time counter, shows "Thinking Xs" / "Thought for Xs"
- `AssistantBubble.tsx` — accepts `reasoning: string` prop but **never renders it**
- `ChatMessageRow.tsx` — passes `reasoning` + `isStreaming` through to AssistantBubble

### Two-phase visual design

| Phase | Trigger | Visual |
|-------|---------|--------|
| **Pre-reasoning** | `isStreaming && !reasoning` | Keep existing `ThinkingAnimation` + `useThinkingTimer` as-is. The "model is cooking" state — no chain-of-thought yet. |
| **Streaming reasoning** | `reasoning.length > 0` (even during streaming) | Transition to a collapsible panel. The cycling word **replaced** by the actual reasoning text streaming in. Timer continues. Collapsed header shows a summary label: first markdown heading, or first ~50 chars. |
| **Done** | `!isStreaming` | Panel auto-collapses by default with the summary header. User can expand to read the full chain-of-thought. |

```
┌─ isStreaming ───────────────────────────────┐
│                                              │
│   [pre-reasoning] → ThinkingAnimation        │
│                      (cycling word + timer) │
│                                              │
│   [reasoning]     → ┌ Collapsible ─────────┐│
│                      │ 🤔 Reasoned about:   ││
│                      │ improving query... ▼ ││
│                      └──────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

### Implementation
- New file: `src/components/chat/ReasoningPanel.tsx` (~80 lines)
- Props: `{ reasoning: string; isStreaming: boolean }`
- Internally delegates to `ThinkingAnimation` when reasoning is empty
- Imports `useThinkingTimer` for the elapsed counter
- Extracts summary from reasoning text for the collapsed header
- Smooth expand/collapse via max-h transition

---

## 2. Remove `subagentRunTool` from `allTools.ts`

**Why:** `subagentRunTool` is already registered as `subagent_run` in `buildRuntimeTools()` via `registerGlobal`. Having it in both `allTools` AND `buildRuntimeTools()` causes duplicate tool name errors in `streamText()`.

**Changes in `core/tools/allTools.ts`:**
- Remove the `import { subagentRunTool } from '@doktor/subagent';` line
- Remove `subagentRunTool` from the array

The Effect.ts version from `packages/subagent` takes over.

---

## 3. Disable Content Tools by Default

`buildRuntimeTools()` in `core/tools/initToolRuntime.ts` currently hardcodes `filterBySource: ['content', 'builtin']`, which includes 5 Effect.ts content tools: `write_article`, `edit_text`, `research`, `question`, `generate_script`.

**Change:** Add an opt-in parameter so content tools are excluded until we explicitly enable them.

```typescript
export function buildRuntimeTools(
  sessionContext?: { sessionID: string; agentID: string; assistantMessageID: string },
  includeContent?: boolean,    // ← new, default false
): Record<string, any> {
  ensureToolRuntimeInit();
  const sources = includeContent ? ['content', 'builtin'] : ['builtin'];
  const mat = materialize({ filterBySource: sources });
  return toAISDKTools(mat, undefined, sessionContext);
}
```

Then in `chatCompletion()`:
```typescript
const runtimeTools = buildRuntimeTools(
  { sessionID, agentID, assistantMessageID },
  false  // content tools disabled for now
);
```

When we're ready, flip to `true` or make it configurable.

---

## 4. Merge Runtime Tools Into `chatCompletion()`

**Current (line 438 of `core/models/aiService.ts`):**
```typescript
tools: buildTools(allTools, isWebSearchEnabled, searchProvider, connectedConnectors),
```

**New:**
```typescript
const runtimeTools = buildRuntimeTools(
  { sessionID, agentID, assistantMessageID },
  false
);
// Legacy tools take precedence on name collision
const all = { ...runtimeTools, ...buildTools(allTools, ...) };
```

Then pass `tools: all`.

Note: `allTools` still contains the 6 connector groups (gmail, github, youtube, telegram, reddit, twitter), `webSearchTool`, and `writeArtifactTool`. Only `subagentRunTool` is removed.

---

## 5. Full File Change List

### Modified files

| File | Change |
|------|--------|
| `core/tools/allTools.ts` | Remove import + entry for `subagentRunTool` |
| `core/tools/initToolRuntime.ts` | Add `includeContent` param to `buildRuntimeTools()` |
| `core/models/aiService.ts` | Import `buildRuntimeTools`, merge into `streamText` call |
| `src/components/chat/AssistantBubble.tsx` | Render `ReasoningPanel` between model label and content |

### New files

| File | Size | Purpose |
|------|------|---------|
| `src/components/chat/ReasoningPanel.tsx` | ~80 lines | Collapsible reasoning display, wraps `ThinkingAnimation` |

### Unchanged

| File | Why |
|------|-----|
| `ChatMessageRow.tsx` | Already passes `reasoning` + `isStreaming` |
| `ThinkingAnimation.tsx` | Kept as-is, consumed by ReasoningPanel |
| `useThinkingTimer.ts` | Kept as-is, consumed by ReasoningPanel |
| `packages/tool-runtime/` | No changes |
| `packages/llm-providers/` | No changes |

---

## 6. What This Unlocks

1. **Users see model reasoning** — collapsible panel with live streaming, summary extraction, smooth animation
2. **Deduplicated tool pipeline** — `subagent_run` comes from one source (Effect.ts)
3. **Content tools registered but dark** — ready to flip on with one boolean change
4. **No Effect.ts in frontend** — ReasoningPanel is pure React + existing hooks
