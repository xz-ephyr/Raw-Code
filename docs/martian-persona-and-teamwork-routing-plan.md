# Martian Persona & Teamwork Routing — Implementation Plan

## Validated User Intent

**Surface intent:** Add a "Martian" codename persona to the main chat and make the default mode intelligently route between direct tool calls, subagent spawning, and pipelines.

**Latent intent revealed by reconnaissance:**
- The Martian is a **persona identity** (greeting + behavioral rules), not a base system rewrite
- Question-asking behavior should use the **existing question panel** (already fully built)
- Teamwork routing should be the **default** when no persona is selected, not a separate mode
- Both changes should be minimal, reversible, and not refactor existing systems

## Key Findings

### Martian Persona (Fully understood chain)
| Layer | File | Status |
|-------|------|--------|
| Persona definitions | `core/persona/{types,index,writer,researcher,video}.ts` | 3 existing, add Martian |
| System prompt assembly | `core/models/aiService.ts:138-181` | Persona appended via `getPersonaById()` |
| Mode selector UI | `src/components/chat/NTabDropdown.tsx` | Auto-renders from `PERSONAS` array |
| Question panel | `packages/tool-runtime/src/content/question.ts` + `QuestionDialog.tsx` | Fully exists |
| Default mode | `src/hooks/useChatTransport.ts:10` | Currently hardcoded to `'writer'` |

### Teamwork Routing (Architectural gap)
| Aspect | Current | Needed |
|--------|---------|--------|
| Tool selection | LLM decides among ~40 flat tools | Code-level complexity classification |
| Subagent gate | None — `subagent_run` is just another tool | Automatic routing when no persona selected |
| Mode purpose | Changes persona prompt only | Default mode = no persona = routing active |
| Execution | Single `streamText()` call | Pre-processing gate before `streamText()` |

## Professional Engineering Reasoning

### Martian: New Persona, Not Default Identity
- Adding Martian as a persona in the existing `PERSONAS` array requires zero structural changes
- The `NTabDropdown` auto-renders from the array — no UI wiring needed
- Question-asking instructions embedded in the Martian system prompt using concrete behavioral directives (examples + "ALWAYS" language)
- Martian applies only when selected (isolated from Writer/Researcher/Video)
- Subagents spawned from Martian-mode chats **do not** inherit Martian identity — workers stay focused

### Teamwork: Pre-processing Gate, Not a New Tool
- Prompt-based routing ("better instructions to use subagent_run") already exists and doesn't work well — LLMs optimize for immediate tool calls
- Code-based routing classifies user intent using lightweight heuristics (<1ms, no LLM call for classification)
- When `modeId` is `undefined` (no persona selected), complex tasks are intercepted and routed to `runSubAgent()` directly
- Simple tasks pass through to normal `streamText()` unchanged
- Classification is conservative — defaults to `'direct'` when uncertain
- The subagent output is fed through a 1-step `streamText` wrapper to produce a proper `StreamTextResult` for the UI layer (cost: ~10 output tokens per routed message)

### Interaction
- Martian persona and teamwork routing are **independent concerns** that share a single activation mechanism
- The default changes to `undefined` (fixes the bug where `'writer'` hijacks new sessions)
- When user selects Martian: Martian persona active, no routing
- When user selects no persona (default): no persona, routing active
- When user selects Writer/Researcher/Video: unchanged behavior

## Precise Placement Strategy

### Files to Create

| File | Contents | Lines |
|------|----------|-------|
| `core/persona/martian.ts` | Martian persona definition with question-asking instructions | ~20 |
| `core/models/routeClassifier.ts` | `classifyMessage()` — heuristic complexity classifier | ~40 |

### Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `core/persona/index.ts` | Import + register Martian in `PERSONAS` array | +2 |
| `src/components/chat/NTabDropdown.tsx` | Add `AiChat01Icon` import, icon map entry, `orange-500` color | +3 |
| `src/hooks/useChatTransport.ts:10` | Fix default from `'writer'` to `undefined` | +1 |
| `core/models/aiService.ts` | Add import + routing block before `streamText()` call | ~30 |

### No Changes Needed
- `packages/subagent/src/subagent.ts` — routing imports and calls existing `runSubAgent()`
- `packages/tool-runtime/src/registry/materialize.ts` — routing calls existing `materialize()`
- `packages/subagent/src/personalities.ts` — Martian persona is main-chat only (not a subagent personality)

## Risks, Trade-offs, and Testing

### Risks
| Risk | Mitigation |
|------|-----------|
| Routing misclassifies complex task as simple | Conservative classifier: requires 2+ triggers or 4+ sentences. Defaults to `'direct'` on uncertainty |
| Extra LLM call for subagent-routed messages | Wrapper `streamText` is 1-step with empty tools (~10 output tokens) |
| Breaking existing `useChatTransport` callers | Return type unchanged (`StreamTextResult`) — wrapper produces valid result |
| Martian persona on/off confusion | Orange color + distinct icon make it visually distinct from other modes |

### Testing
- **`classifyMessage()` unit tests**: short messages → `direct`, 4+ sentences → `subagent`, trigger keywords → `subagent`
- **Integration**: `chatCompletion` with `modeId: undefined` + complex message → routes to subagent
- **Regression**: `chatCompletion` with `modeId: 'writer'` → unchanged behavior

### Rollback
- Each change is self-contained in 1–2 files
- Remove Martian: delete `martian.ts`, revert 3 files (index, NTabDropdown, useChatTransport)
- Remove routing: delete `routeClassifier.ts`, revert `aiService.ts`

## Recommendation

**Proceed with the full plan as specified.** The changes are:
- **Surgical**: 2 new files, 4 edited files, ~100 lines total
- **Reversible**: each change isolated to its concern
- **Non-destructive**: no existing feature is modified or removed
- **Progressive**: Martian persona works immediately; routing activates automatically when default mode is active

The plan avoids the common pitfalls of over-engineering (no new abstraction layers, no routing UI, no subagent API changes) while delivering both requested capabilities.
