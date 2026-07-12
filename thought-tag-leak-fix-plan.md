# Thought Tag Leak Fix — Artifact Intention Cleanup Plan

**Date:** 2026-07-12
**Status:** Plan — awaiting permission to implement

---

## 1. Validated User Intent

### Surface request
Optimize the artifact writing flow to show clean intention text instead of raw `<thought>` tags leaking from the model output.

### Latent meaning (triangulated)
- The model (Gemma 4, Qwen, etc.) natively wraps reasoning in `<thought>`/`<think>` tags
- The user previously removed thinking UI support (ThinkingPill, ThinkingTimeline, etc.)
- The tags leak through because three missing mechanisms: (a) `extractReasoningMiddleware` never applied, (b) `getModelCapability()` dead code, (c) no client-side stripping
- The fix must be pure text processing — NOT adding back thinking infrastructure
- Two test functions (`extractThinkTags`, `cleanReasoning`) exist in test imports but are missing from source — tests currently fail

---

## 2. Key Findings (Sub-Agent 1)

### The leak chain (three failures)

| # | Missing Mechanism | Location | Detail |
|---|---|---|---|
| 1 | `extractReasoningMiddleware` never applied | `core/models/aiService.ts:305-320` | AI SDK provides middleware to strip `<thought>`/`<think>` tags at stream level — never imported |
| 2 | `getModelCapability()` never called | `core/reasoning/capabilities.ts:28-32` | Maps Gemma→`<thought>`, Qwen→`<think>` but is dead code — zero callers |
| 3 | No client-side tag stripping | `src/lib/chatUtils.ts:82-112, 114-161` | `buildContentBeforeAfter()` and `mapUIMessageToLegacyMessage()` pass tags through unfiltered |

### What the model actually outputs
```
<thought>
* Goal: Write a fiction story.
...
</thought>
I'll write a short sci-fi story...

```python
# No code needed here, I will call the write_artifact tool.
```
```

### How tags reach the artifact UI
1. AI SDK `streamText` receives `<thought>` as plain text (no middleware to extract it)
2. `sendReasoning: false` in `ChatPage.tsx:177` skips AI SDK reasoning events — but embedded tags aren't events, they're text
3. `buildContentBeforeAfter()` concatenates ALL text parts before `write_artifact` tool call — tags included
4. `contentBeforeTool` becomes `"<thought>...</thought>\n\nI'll write...\n\n```python\n...\n```"
5. This unfiltered string is streamed as the intention text

### Test expectations (tests/chatUtils.test.ts)
- Line 2 imports `cleanReasoning` and `extractThinkTags` — **functions don't exist**
- 25 test assertions across two `describe` blocks expect specific behavior
- Lines 174-187: `mapUIMessageToLegacyMessage` should strip `<think>` tags and deduplicate reasoning from content

---

## 3. Professional Reasoning (Sub-Agent 2)

### Approach chosen: Client-side stripping (Approach B)

**Why not server-side middleware (Approach A):**
- User explicitly said "anything related [to thinking] might be hindering it" — middleware is reasoning-adjacent infrastructure
- Requires model-to-tag-name mapping (fragile, every new model needs updating)
- Higher blast radius (a bug corrupts every stream)
- Cannot be selective about what to strip

**Why Approach B is correct:**
- Pure regex-based text processing — same category as `sanitizeMarkdownContent` already in `chatUtils.ts`
- Makes existing tests pass (25 assertions currently failing on import)
- `mapUIMessageToLegacyMessage` is called on every incremental message update — streaming is not a problem
- Backward compatible (zero impact on models that never use these tags)
- Simple, testable, no new dependencies

### Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Tags to strip | `<thought>` AND `<think>` | Gemma uses `<thought>`, Qwen uses `<think>` |
| Where to strip | `buildContentBeforeAfter` + `mapUIMessageToLegacyMessage` | Covers artifact contentBeforeTool AND general content |
| What about meta code blocks | Leave for now | Separate issue (system prompt fix, not tag leak) |
| `cleanReasoning` | Implement in `chatUtils.ts` | Makes tests pass, cleans reasoning field |
| `aiService.ts` | No changes | Avoids reasoning-adjacent infrastructure |
| `capabilities.ts` | Stay dead | Not needed for client-side approach |

---

## 4. Precise Placement & Introduction Plan (Sub-Agent 3)

### File A: `src/lib/chatUtils.ts`

#### New function: `extractThinkTags()` (insert before existing helpers)
| Aspect | Detail |
|--------|--------|
| **Signature** | `extractThinkTags(content: string): { cleanContent: string; thinking: string }` |
| **Lines** | ~82-99 |
| **Logic** | 1. Match complete `<thought>...</thought>` / `<think>...</think>` pairs → extract content, remove from text<br>2. Match unclosed `<thought>` / `<think>` at end → extract content, remove from text<br>3. Trim each extracted segment<br>4. Join multiple segments with `\n` |
| **Regex** | `/<\/?(thought|think)>/g` for removal; capture groups for extraction |
| **Export** | Yes |

#### New function: `cleanReasoning()` (insert after `extractThinkTags`)
| Aspect | Detail |
|--------|--------|
| **Signature** | `cleanReasoning(content: string): string` |
| **Lines** | ~101-135 |
| **Logic** | Strip artifact metadata lines, inline artifact format, search headers, bullet URLs, numbered refs, meta-cognition lines, failure loops. Collapse excessive newlines. Trim. |
| **Export** | Yes |

#### Modify `buildContentBeforeAfter()` (lines 82→112)
| Change | Lines | Detail |
|--------|-------|--------|
| Apply `extractThinkTags` to `rawBefore` | After 108 | `const { cleanContent: cleanedBefore } = extractThinkTags(rawBefore.trim());` |
| Apply `extractThinkTags` to `rawAfter` | After 109 | `const { cleanContent: cleanedAfter } = extractThinkTags(rawAfter.trim());` |
| Return cleaned values | ~111 | `contentBeforeTool: cleanedBefore || undefined`, `contentAfterTool: cleanedAfter || undefined` |

#### Modify `mapUIMessageToLegacyMessage()` (lines 114→161)
| Change | Lines | Detail |
|--------|-------|--------|
| Apply `extractThinkTags` to content | After 117 | `const { cleanContent, thinking: extractedThinking } = extractThinkTags(content);` |
| Deduplicate reasoning from content | After (new) | If `reasoning` text appears within `cleanContent`, remove it: `cleanContent.replace(reasoning, '')` |
| Merge extracted thinking into reasoning | ~118 | `reasoning = [reasoning, extractedThinking].filter(Boolean).join('\n');` or similar |
| Use `cleanContent` for final processing | ~147 | Replace `content` with `cleanContent` downstream |

### File B: `tests/chatUtils.test.ts`
- **No changes needed** — imports already exist at line 2
- 3 pre-existing test failures exist (`writeArtifact` vs `write_artifact` naming) — not caused by this change

### File C: Everything else
| File | Status | Reason |
|------|--------|--------|
| `core/models/aiService.ts` | **No change** | Avoid reasoning-adjacent infrastructure |
| `core/reasoning/capabilities.ts` | **No change** | Dead code stays dead |
| `core/reasoning/index.ts` | **No change** | Dead code stays dead |
| `AssistantBubble.tsx` | **No change** | `contentBeforeTool` arrives clean |
| `useWriteArtifactStream.ts` | **No change** | Intention text is already clean |
| `src/styles/index.css` | **No change** | Not related |

---

## 5. Risks, Trade-offs & Testing

### Risks

| Risk | Mitigation |
|------|-----------|
| Regex fails on unusual tag formatting (nested, attributes) | Test coverage for edge cases; tags in practice are always well-formed `<thought>...</thought>` |
| Valid `<thought>` content (user asks about "thought") gets stripped | Extremely rare; tag patterns are model-internal and never user-authored |
| `cleanReasoning` strips legitimate reasoning | Conservative patterns (targets specific artifact/search/meta markers only); test at line 54-57 confirms normal planning preserved |
| `'strips reasoning that leaked into content'` test (line 174) — fragile dedup | Simple substring removal within content; only fires when `reasoning` field and text match |

### Testing
- `extractThinkTags`: 9 test assertions already written — will pass immediately
- `cleanReasoning`: 16 test assertions already written — will pass immediately
- `mapUIMessageToLegacyMessage`: 2 new assertions (line 174-180, 182-187) added to existing test — will pass
- Manual: Verify `<thought>` tags no longer visible in artifact intention during streaming, verify old messages without tags render identically

### Rollback
- Revert `chatUtils.ts` changes only (1 file)
- Tests revert to failing state (pre-existing)

---

## 6. Recommendation

**Proceed with implementation.** Scope is minimal:
- **1 file modified** (`src/lib/chatUtils.ts`)
- **2 new pure functions** (`extractThinkTags`, `cleanReasoning`)
- **2 existing functions modified** (`buildContentBeforeAfter`, `mapUIMessageToLegacyMessage`)
- **25+ test assertions** that are currently failing will pass
- **Zero changes** to AI service, components, hooks, or CSS
- **Zero thinking infrastructure** added — pure text processing
