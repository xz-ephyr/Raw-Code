# Unified Streaming Panel Plan

## Goal

Replace the `isStreaming ? mergedPanel : separatePanels` ternary with a **single** `Collapsible` that transitions its header and content in place — no DOM swap, no layout shift.

---

## Current Architecture

```
isStreaming=true                     isStreaming=false
┌──────────────────────┐            ┌──────────────────────┐
│ ◐ thinking           │            │ Completed 3 actions  │  ← ActionSummary
│   (collapsible)      │            │   (collapsible)      │
│   reasoning          │     →      ├──────────────────────┤
│   research steps     │            │ Thought for 12s      │  ← Reasoning
│   action timeline    │            │   (collapsible)      │
└──────────────────────┘            ├──────────────────────┤
                                    │ Thought for 12s      │  ← ChainOfThought
                                    │   (collapsible)      │
                                    └──────────────────────┘
```

**Problem:** Abrupt visual change. Three new panels pop in, one disappears.

---

## Target Architecture

```
isStreaming=true                     isStreaming=false
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ ◐ thinking                   │    │ thought · 3 actions · 12s    │
│   (collapsible)              │ →  │   (same collapsible element) │
│   reasoning (streaming...)   │    │   reasoning (final text)     │
│   ✓ searched X               │    │   ✓ searched X               │
│   ◌ fetching Y...            │    │   ✓ fetched Y                │
└──────────────────────────────┘    └──────────────────────────────┘
```

**Key:** Same `<Collapsible>` element, same `<CollapsibleTrigger>`, same `<CollapsibleContent>` — only the text and content change.

---

## Header State Machine

### 3 post-streaming states

| # | Scenario | Streaming header | Post-streaming header |
|---|----------|-----------------|----------------------|
| 1 | No reasoning, no tools | `◐ thinking` | `thought` |
| 2 | Reasoning only | `◐ thinking` | `thought · 12s` |
| 3 | Tools called (± reasoning) | `◐ thinking` | `thought · 3 actions · 12s` |

### Header logic (pseudocode)

```tsx
const duration = completionDuration ? Math.round(completionDuration / 1000) : null;
const hasTools = hasActionSummary || hasResearchSteps;
const actionCount = actionSummary?.actions?.length ?? researchCalls.length ?? 0;

const headerLabel = isStreaming ? null : hasTools
  ? `thought · ${actionCount} action${actionCount > 1 ? 's' : ''}${duration ? ` · ${duration}s` : ''}`
  : `thought${duration ? ` · ${duration}s` : ''}`;
```

### Visual layout

**Streaming:**
```
◐ thinking   [chevron]
```

**Post-streaming #1 (no tools, no reasoning):**
```
thought      [chevron]
```

**Post-streaming #2 (reasoning only):**
```
thought · 12s   [chevron]
```

**Post-streaming #3 (tools called):**
```
thought · 3 actions · 12s   [chevron]
```

---

## Content Area (always in same CollapsibleContent)

Always render everything, but sections are empty when absent:

1. **Reasoning text** — via `<Streamdown>` (always present div, empty if no reasoning)
2. **Research steps** — via `<ChainOfThoughtStep>` (empty if no researchCalls)
3. **Action timeline** — via `<ActionTimeline>` (empty if no actions)

During streaming, each section shows its live/streaming state automatically:
- `Streamdown` renders partial reasoning text
- Tool calls show spinning/complete icons
- Action timeline shows tools as they arrive

After streaming, same elements show final state — no re-render or swap needed.

---

## What Needs to Change

### File: `src/components/chat/AssistantBubble.tsx`

| Section | Current | New |
|---------|---------|-----|
| Lines 128-227 | `isStreaming ? mergedPanel : (...) /* three separate panels */` | Single `Collapsible` — always rendered, unconditonal |
| Trigger text | `◐ thinking` (hardcoded) | Dynamic: `isStreaming ? spinner+"thinking" : headerLabel` |
| Chevron | Previously removed | Add back (needed for accordion) |
| Content | Conditionally rendered inside streaming branch | Always render reasoning + research + actions |
| Imports | `Reasoning`, `ReasoningTrigger`, `ReasoningContent`, `ChainOfThought`, `ChainOfThoughtHeader`, `ChainOfThoughtContent`, `ActionSummary`, `ActionSummaryTrigger`, `ActionSummaryContent` | <ins>Remove</ins> all these imports — no longer used |

### Files to delete/modify

| File | Action |
|------|--------|
| `src/components/ai/reasoning.tsx` | <ins>No change</ins> — still used elsewhere |
| `src/components/ai/chain-of-thought.tsx` | <ins>No change</ins> — still used elsewhere |
| `src/components/ai/action-summary.tsx` | <ins>No change</ins> — still used elsewhere, the spinner change stays |
| `src/components/chat/AssistantBubble.tsx` | <ins>Primary change</ins> — unify the panel, remove imports |

---

## Step-by-step Implementation

### Step 1: Unify the Collapsible

Remove the `isStreaming ? ... : ...` ternary. Render a single `Collapsible` unconditionally.

**Before:**
```tsx
{isStreaming ? (
  <Collapsible>...trigger...content...</Collapsible>
) : (
  <>
    {hasActionSummary && <ActionSummary>...</ActionSummary>}
    {reasoning && <Reasoning>...</Reasoning>}
    {hasResearchSteps && <ChainOfThought>...</ChainOfThought>}
  </>
)}
```

**After:**
```tsx
<Collapsible className="not-prose mb-4" defaultOpen={false}>
  <CollapsibleTrigger>...</CollapsibleTrigger>
  <CollapsibleContent>
    {reasoning && <Streamdown>{reasoning}</Streamdown>}
    {hasResearchSteps && /* research steps */}
    {hasActionSummary && <ActionTimeline actions={...} />}
  </CollapsibleContent>
</Collapsible>
```

This is safe — when the conditions are false during streaming, the content sections simply don't render. When streaming ends and data appears, they render.

### Step 2: Dynamic header text

```tsx
const duration = completionDuration ? Math.round(completionDuration / 1000) : null;
const hasTools = hasActionSummary || hasResearchSteps;
const actionCount = actionSummary?.actions?.length ?? researchCalls.length ?? 0;

const showPostStreaming = !isStreaming && (reasoning || hasTools);
const headerLabel = showPostStreaming
  ? hasTools
    ? `thought · ${actionCount} action${actionCount > 1 ? 's' : ''}${duration ? ` · ${duration}s` : ''}`
    : reasoning
      ? `thought${duration ? ` · ${duration}s` : ''}`
      : 'thought'
  : null;
```

Trigger render:
```tsx
<CollapsibleTrigger className="flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
  {isStreaming && (
    <span className="inline-flex items-center justify-center size-4 text-sm leading-none">{SPINNER_CHARS[spinnerFrame]}</span>
  )}
  <span className={cn("writing-shimmer-text", !isStreaming && "shimmer-text")}>
    {headerLabel ?? 'thinking'}
  </span>
  <ChevronDownIcon className="size-4 shrink-0 transition-transform ml-auto group-data-[state=open]/collapsible:rotate-180" />
</CollapsibleTrigger>
```

Wait — post-streaming text shouldn't shimmer. The shimmer is only for streaming. Post-streaming can use `text-muted-foreground` or a subtle static style.

### Step 3: Remove unused imports

Remove:
- `Reasoning`, `ReasoningTrigger`, `ReasoningContent`
- `ChainOfThought`, `ChainOfThoughtHeader`, `ChainOfThoughtContent`
- `ChainOfThoughtStep`, `ChainOfThoughtSearchResults`, `ChainOfThoughtSearchResult`
- `ActionSummary`, `ActionSummaryTrigger`, `ActionSummaryContent`

Keep:
- `ActionTimeline`, `type ActionItem` (used in content)
- `MarkdownErrorBoundary` (used for Streamdown wrapping)
- `Streamdown` (used for reasoning rendering)

### Step 4: Verify

- No type errors (`npx tsc --noEmit`)
- Spinner cycles during streaming
- Header transitions to correct text after streaming
- Content sections appear when data present
- Chevron collapses/expands content
- Clicking "thought" text toggles content

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Stream starts, no data yet | `Collapsible` renders with spinner + "thinking", content empty |
| Tool call starts during streaming | Action timeline item appears in content |
| Reasoning starts mid-stream | Reasoning section appears in content |
| Stream finishes, no reasoning, no tools | Header shows `thought`, collapsible empty |
| Stream finishes, reasoning only | Header shows `thought · 12s`, reasoning in content |
| Stream finishes, tools only | Header shows `thought · 3 actions · 12s`, actions in content |
| Stream finishes, both | Header shows `thought · 3 actions · 12s`, reasoning + actions in content |
| Error during streaming | Error propagates (retry removed), header stays as-is until error callback clears state |
