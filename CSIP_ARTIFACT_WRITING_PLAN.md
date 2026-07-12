# CSIP-Ω: Artifact Writing UX — Reconnaissance & Implementation Plan

**Date:** 2026-07-12
**Status:** Plan — awaiting permission to implement

---

## 1. Validated User Intent (Surface + Latent)

### Surface request
Fix the artifact writing flow so that:
1. A 2-sentence intent explanation appears first
2. A shimmering `writing — {filename}` text appears during the intention phase
3. Shimmer is tied to artifact writing state, not global `isStreaming`
4. The `ArtifactsPreviewCard` is hidden during writing (shown after done)
5. A summary appears tightly below the writing line when done
6. Spacing between intent + writing line + summary is tight
7. A new intermediate `'writing'` phase exists between `'intention'` and `'done'`

### Latent meaning (triangulated)
- The shimmer should indicate **artifact generation**, not message streaming
- The `'writing'` phase brackets the tool-execution period (no real-time execution signal exists in this SDK)
- The clickable card should be hidden during writing, not deleted permanently
- The `thinking-shimmer-text` CSS class name is a leftover from a removed thinking timeline
- Old completed messages may lose the "writing — filename" line when phase resolves to `'done'` — this is acceptable (showing "writing" for something already done was always wrong)

---

## 2. Key Findings (Sub-Agent 1)

| Finding | File | Lines | Detail |
|---------|------|-------|--------|
| `showWritingLine` hides during intention | `AssistantBubble.tsx` | 70-72 | `phase === 'done' \|\| (!contentBeforeTool)` — intention phase excluded when contentBeforeTool exists |
| Shimmer gated on `isStreaming` | `AssistantBubble.tsx` | 92 | `isStreaming ? 'thinking-shimmer-text' : 'text-muted-foreground'` — wrong signal |
| Phase model missing `'writing'` | `useWriteArtifactStream.ts` | 3 | Only `'idle' \| 'intention' \| 'done'` |
| No tool-state awareness | `useWriteArtifactStream.ts` | all | Hook never receives tool state; transitions only based on intention text progress |
| Tool state available but unused | `chatUtils.ts` / `AssistantBubble.tsx` | 66-67 | `ti.state !== 'result'` only checked for non-write_artifact tools |
| ArtifactsPreviewCard gated on `!isStreaming` | `AssistantBubble.tsx` | 118 | Should be gated on artifact phase |
| Spacing too loose | `AssistantBubble.tsx` | 92, 98, 104 | `mt-1.5` (writing) + `mt-0.5` (summary) + `mt-2` (after-tool) |
| CSS class name misleading | `index.css` | 174 | `.thinking-shimmer-text` references removed system |

---

## 3. Professional Reasoning (Sub-Agent 2)

### Phase Model
```
idle → intention → writing → done
```
| Transition | Trigger | Location |
|------------|---------|----------|
| `idle → intention` | `hasWriteArtifact && contentBeforeTool` present | Hook (same as now) |
| `intention → writing` | Intention reveal animation completes (intentionLen >= total) | Hook (was `→ done`) |
| `writing → done` | Tool invocation `state === 'result'` for ALL write_artifact calls | Component passes `isToolDone` to hook |

### Key Design Decisions
- **Shimmer gate**: `phase === 'writing'` (not `isStreaming`)
- **CSS rename**: `.thinking-shimmer-text` → `.writing-shimmer-text`
- **Spacing**: Parent `gap-1` (4px), remove all `mt-*` from children
- **ArtifactsPreviewCard gate**: `phase === 'done'` (not `!isStreaming`)
- **Summary gate**: `phase === 'done'` (not `!isStreaming`)
- **No intention text**: Skip `'intention'`, go `idle → writing` directly
- **Multiple tool calls**: Wait for ALL `write_artifact` to reach `'result'`
- **Tool error**: Still transition `writing → done`; UI could show error variant

### Edge Cases Handled
- Late-arriving `contentBeforeTool`: Effect fires when it becomes truthy
- Tool result during intention: Hook checks `isToolDone` even during intention phase
- Multiple write_artifact calls: `isToolDone = toolInvocations.every(ti => ti.toolName !== 'write_artifact' \|\| ti.state === 'result')`
- No intention text: Hook transitions directly to `'writing'`

### Backward Compatibility
- Old completed messages (no streaming): `phase === 'done'` immediately → no visual regression (writing line not shown, which is correct improvement)
- Old streaming messages (isStreaming=true): now shows writing line during intention (was hidden before — the fix)
- No breakage of other callers (only AssistantBubble uses the hook)

---

## 4. Precise Placement & Introduction Plan (Sub-Agent 3)

### File A: `src/hooks/useWriteArtifactStream.ts`

| Change | Lines | Description |
|--------|-------|-------------|
| Phase type | 3 | `'idle' \| 'intention' \| 'writing' \| 'done'` |
| Hook signature | 5-8 | Add `isToolWritingDone: boolean = true` as 3rd param |
| intention→writing (intentionLen >= total) | 25-26 | `setPhase('done')` → `setPhase('writing')` |
| New effect: writing→done | After 36 | Watch `phase === 'writing' && isToolWritingDone` → `setPhase('done')` |

### File B: `src/components/chat/AssistantBubble.tsx`

| Change | Lines | Description |
|--------|-------|-------------|
| Derive `isToolDone` | After 63 | `!hasWriteArtifact \|\| toolInvocations.every(ti => ti.toolName !== 'write_artifact' \|\| ti.state === 'result')` |
| Pass `isToolDone` to hook | 61-63 | 3rd argument |
| `showWritingLine` | 70-72 | `phase === 'intention' \|\| phase === 'writing'` |
| Writing line className | 92 | `phase === 'writing' ? 'writing-shimmer-text' : 'text-muted-foreground'`; remove `mt-1.5` |
| Intention text gate (done block) | 85 | Add `phase === 'writing'` to the condition |
| Summary gate | 97 | `phase === 'done' && artifactSummary`; remove `mt-0.5` |
| contentAfterTool gate | 103 | `phase === 'done' && contentAfterTool`; remove `mt-2` |
| ArtifactsPreviewCard gate | 118 | `phase === 'done'` instead of `!isStreaming` |
| Parent container gap | 76 | `gap-0` → `gap-1` |

### File C: `src/styles/index.css`

| Change | Lines | Description |
|--------|-------|-------------|
| Class rename | 174 | `.thinking-shimmer-text` → `.writing-shimmer-text` |
| prefers-reduced-motion | 208 | Same rename |

### Files NOT to change
- `src/lib/chatUtils.ts` — data extraction unchanged
- `src/components/chat/MessageList.tsx` — `isStreaming` still needed for footer actions
- `src/components/chat/ChatMessageRow.tsx` — pure pass-through, no new props
- `src/components/chat/ArtifactsPreviewCard.tsx` — only visibility gate changes in parent
- `src/components/chat/MarkdownMessage.tsx` — rendering logic unchanged

---

## 5. Risks & Trade-offs

| Risk | Mitigation |
|------|-----------|
| Old completed messages lose "writing — filename" line (when phase='done') | Acceptable — showing "writing" for completed artifacts was incorrect UX |
| `isToolDone` not available for legacy tool format | `!hasWriteArtifact` → defaults to `true`, falls through gracefully |
| Shimmer stops prematurely if tool result arrives before intention reveal finishes | Hook checks `isToolDone` during all phases; skips to `'done'` if needed |
| Multiple write_artifact calls in one message with staggered results | isToolDone waits for ALL to complete before `writing → done` |
| CSS rename breaks any other component using `.thinking-shimmer-text` | Grep confirms only `AssistantBubble.tsx:92` uses this class |

## 6. Testing Recommendations

- **Hook unit tests**: Phase transitions (idle→intention, intention→writing, writing→done), edge cases (no intention text, mid-reveal tool result, multiple calls)
- **Component render tests**: Each phase renders correct elements, shimmer class present only during writing, ArtifactsPreviewCard hidden during writing
- **Manual verification**: Full streaming flow with artifact, old completed messages render correctly, no-intention-text flow

## 7. Recommendation

**Proceed with implementation.** Changes are:
- Minimal (3 files modified, ~20 lines total changed)
- Reversible (revert 3 files)
- Backward-compatible for all rendering paths
- Targeted (no architectural changes, no new dependencies, no new props)

The fix addresses all 7 user requirements without scope creep.
