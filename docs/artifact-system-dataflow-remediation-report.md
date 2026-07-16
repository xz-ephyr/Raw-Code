# Artifact System — Data Flow Remediation Report

**Date:** 2026-07-15  
**Scope:** Comprehensive bug sweep of the artifact document pipeline  
**Files Analyzed:** 16 source files across core, packages, src, and tests  
**Status:** Analysis complete — awaiting implementation permission

---

## Executive Summary

The artifact system has **4 root causes** producing **30+ individual bugs**. The most critical issues cause silent data loss (versioned file updates are dropped), corrupt reasoning display on session reload (double-mapping), show premature "done" status on artifact animations (phase race), and provide zero meaningful test coverage (tests assert non-existent properties).

Fixing these requires surgical changes to 7 files across 3 independent batches. The "surgical strike" (highest value, lowest risk) can be done in ~2.5 hours and addresses the three bugs users most directly experience.

---

## 1. Validated User Intent

| Dimension | Detail |
|-----------|--------|
| **Surface intent** | Explore for bugs related to "artifacts" — the document/file output pipeline |
| **Latent intent** | Understand why the artifact system behaves inconsistently (files not updating, wrong types, broken tests, flaky animations) and get it fixed properly |
| **Confirmed** | Yes — user confirmed the intent synthesis on 2026-07-15 |

---

## 2. Key Findings (Sub-Agent 1)

### 🔴 P0 Bugs — Silent Data Loss or Crash

| # | File:Line | Issue |
|---|-----------|-------|
| 1 | `src/pages/ChatPage.tsx:198,231-233` | **Double-mapping corrupts data on session load.** `setMessages(mapped)` stores derived data back into raw state; `useMemo` re-derives from already-derived data, corrupting `reasoning` (concatenated twice) and `files` (re-extracted from tool invocations that may no longer exist). |
| 2 | `src/hooks/useFilePanel.ts:11-14` | **`processedIdentifiersRef` permanently drops versioned updates.** Once an identifier is processed, EVERY subsequent file with same identifier is silently discarded — the versioning logic on lines 24-44 is dead code that never executes for updates. |
| 3 | `src/lib/chatUtils.ts:233` | **Research results typed as `pdf` but content is markdown.** Forces `PdfPreview` to attempt PDF rendering on plain text, producing auto-generated blank PDFs instead of readable content. |
| 4 | `core/tools/writeArtifactTool.ts:14-16` | **No-op passthrough executor returns Promise, not Effect.** Incompatible with Effect.ts tool-runtime — silent failure when registered through `buildRuntimeTools()`. |

### 🔴 P1 Bugs — Incorrect Behavior

| # | File:Line | Issue |
|---|-----------|-------|
| 5 | `tests/chatUtils.test.ts:213-234,241` | **All `mapUIMessageToLegacyMessage` tests assert `result.artifacts`** — property doesn't exist (code produces `result.files`). **Every test in this suite fails.** Zero coverage of artifact extraction. |
| 6 | `tests/chatUtils.test.ts:253-256` | **`contentBeforeTool` test uses `writeArtifact` (camelCase)** but `buildContentBeforeAfter` checks for `write_artifact` (underscore). Test expects `'before'` but gets `undefined`. |
| 7 | `src/components/chat/AssistantBubble.tsx:68-70` | **`isToolDone` only checks `write_artifact` calls.** Non-`write_artifact` tools (research, write_article) set `isToolDone = true` even when the actual artifact is still streaming. Premature "done" transition. |
| 8 | `src/hooks/useWriteArtifactStream.ts:14-27` | **Race condition between `idle→done` and `idle→intention` effects.** Both fire on same render with `startTransition` batching — non-deterministic phase behavior. |
| 9 | `core/tools/writeArtifactTool.ts:10` | **Tool schema allows only 5 of 10 `FileType` values.** LLM cannot produce `code`, `html`, `react`, `svg`, or `mermaid` through the tool API — only through the XML tag fallback. |
| 10 | `core/models/aiService.ts:258` | **Legacy tools override runtime tools** (`{ ...runtimeTools, ...legacyTools }`). LLM sees both `write_artifact` AND `write_article` — duplicate overlapping tools. |
| 11 | `packages/tool-runtime/src/content/version-store.ts:14-16` | **Colon in `artifactId` corrupts key parsing.** `makeKey` uses `:` separator; `getAllArtifactIds` splits on `:` — if ID contains `:`, parsing is wrong. |

### 🟡 Code Smells & 🟠 Gaps

| Count | Category | Key Examples |
|-------|----------|-------------|
| 8 | Type safety | `[key: string]: any` wildcards, `any` type assertions, brittle string matching |
| 6 | Error handling | Empty catch blocks, silent fallbacks, no error logging |
| 5 | Download/MIME | HTML content labeled `application/msword`, `Uint8Array` may produce zero-length, Excel is table-only |
| 4 | Missing functionality | Multi-file display (only `files[0]` shown), syntax highlighting for code types, unquoted attr parsing |
| 3 | Versioning | `isBase64('')` returns true, version-store unbounded growth, dead `author` field |
| 2 | Stub code | `write-article.ts:47-53` has placeholder content instead of real generation |

---

## 3. Professional Reasoning (Sub-Agent 2)

### Root Cause Analysis

The 30+ findings collapse into **4 true root causes**:

| Root Cause | Affected Findings | Description |
|------------|------------------|-------------|
| **A: Dual tool systems** | 4, 7, 9, 10, 11 | Legacy tools (zod + ai-sdk, `write_artifact`) vs runtime tools (Effect.ts, `writeArticle`). Incompatible naming, schemas, and execution models. LLM sees both. |
| **B: State ownership violation** | 1, 6 | Derived data (`files`, `reasoning`) stored back into raw data source (`useChat`). Second derivation pass corrupts the structure. |
| **C: Versioning identity broken** | 2, 11 | `processedIdentifiersRef` blacklists identifiers permanently. Versioning logic is dead code. `version-store.ts` uses fragile key scheme. |
| **D: Streaming phase race** | 8, 7 | Two competing effects on same render + too-narrow `isToolDone` predicate = non-deterministic phase transitions and premature "done". |

### Correct Design Principles

**Unidirectional data flow with clear transformation boundaries:**

```
LLM response → raw AI SDK message (UIMessage) 
              → mapUIMessageToLegacyMessage (pure derivation)
              → UI rendering (AssistantBubble, FilePanel)
              → DatabaseService.saveMessages (store raw, not derived)
```

- **Never store derivations back into the raw source.** `setMessages(mapped)` is the bug — mapped messages should live in a separate state or be derived via `useMemo` only.
- **Versioning is identity + update semantics.** `identifier` is the stable key. Same identifier + different content = update. `processedIdentifiersRef` must be removed.
- **Streaming phase machine should have a single transition source.** One effect to rule them all — avoid competing effects on the same initial state.
- **Tool naming should be consistent.** Either `write_artifact` (legacy, LLM-trained) or `writeArticle` (runtime, type-safe) — not both.

---

## 4. Placement & Introduction Strategy (Sub-Agent 3)

### Batch 1: "Stop the Bleeding" — Immediate Fixes

**Time estimate:** ~2.5 hours  
**Risk:** Low — behavioral fixes only, no schema/API changes  
**Backward compat:** Perfect — fixes broken behavior, no state migration needed

| File | Lines | Change |
|------|-------|--------|
| `src/hooks/useFilePanel.ts` | 9, 12-14, 22, 115 | Remove `processedIdentifiersRef`; replace with version-aware dedup (skip if `version <= existing` AND `content === existing`) |
| `src/components/chat/AssistantBubble.tsx` | 52-70 | Fix `isToolDone` to check ALL artifact tool names via `ARTIFACT_TOOL_NAMES`, not just `write_artifact` |
| `src/hooks/useWriteArtifactStream.ts` | 14-19, 22-27, 46-51 | Remove the `idle→done` direct-jump effect; centralize all phase transitions into a single combined effect |
| `src/pages/ChatPage.tsx` | 342-346 | Add version check in `handleOpenFile`: skip `addFiles` if file with same identifier already has higher/equal version |

**Verification:**
1. Open chat with existing `write_artifact` → animation plays correctly through all phases
2. Ask AI to update an artifact → file panel shows new version, history accessible
3. Session reload → files render correctly, reasoning is not doubled

### Batch 2: "Clean the Pipeline" — Double-Mapping Fix

**Time estimate:** ~3 hours  
**Depends on:** Batch 1  
**Risk:** Low — changes data flow but preserves backward compatibility

| File | Lines | Change |
|------|-------|--------|
| `src/lib/chatUtils.ts` | 172-269 | Split into `mapLiveMessage` (derives from `parts`) and `hydrateStoredMessage` (reads precomputed fields from DB) |
| `src/pages/ChatPage.tsx` | 198 | For session load, use `hydrateStoredMessage` instead of `mapUIMessageToLegacyMessage` |
| `src/pages/ChatPage.tsx` | 231-233 | Keep `mapUIMessageToLegacyMessage` only for live (streaming) messages |
| `src/lib/chatUtils.ts` | 254 | Add guard: prefer tool-produced files over XML-parsed files |
| `core/utils/DatabaseService.ts` | 148-161 | Add field filtering — don't store derived `files` array, only store `toolInvocations` (JSON) |

**Verification:**
1. Load old session with artifacts → files render correctly
2. `contentBeforeTool` text appears correctly
3. DB inspection: `files` field absent from saved messages (reconstructed from `toolInvocations`)
4. New streaming messages still produce correct file cards

### Batch 3: "Unify the Tools" — Dual System Resolution

**Time estimate:** ~4 hours  
**Depends on:** Batch 1, Batch 2  
**Risk:** Medium — affects LLM-facing tool names; needs system prompt coordination

| File | Lines | Change |
|------|-------|--------|
| `core/tools/writeArtifactTool.ts` | 4-16 | Rename to `legacy_write_artifact` or bridge through Effect runtime |
| `packages/tool-runtime/src/builtins.ts` | 49 | Register legacy bridge tool that accepts `write_artifact` name but routes through Effect system |
| `core/tools/allTools.ts` | 12 | Remove `writeArtifactTool` from array (now registered via runtime) |
| `src/lib/fileParser.ts` | 4 | Remove `write_artifact` from XML parser regex (only match `antArtifact` for backward compat) |
| `core/prompt/systemPrompt.ts` | 11 | Update LLM-facing tool name documentation |

**Verification:**
1. LLM calls `write_artifact` → tool executes through Effect runtime with idempotency/schema/events
2. No tool name collisions in `allToolsMerged`
3. Old sessions with `write_artifact` tool calls still render correctly (files already stored in DB)

---

## 5. Risks & Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Batch 2 changes existing DB message format** — old sessions may still have `files` stored. The `hydrateStoredMessage` must handle both formats. | Add `files` field detection: if present, use as-is; if absent, reconstruct from `toolInvocations`. Phased migration over 1-2 releases. |
| **Batch 3 changes LLM-facing tool name** — `write_artifact` is documented in system prompt. LLM may fail to call the tool correctly if name changes. | Keep `write_artifact` as the registered name in the Effect bridge. Only change internal implementation, not the API contract. |
| **`processedIdentifiersRef` removal may cause duplicate display** if `addFiles` is called twice for the same file in the same render cycle. | The version-aware dedup handles this: same version + same content = skip. Only true updates produce visible changes. |
| **Streaming phase changes may affect animation UX** — users expect the current `intention→writing→done` flow. | The fix ensures correct timing (no premature `done`), which improves UX. The visual layout stays the same. |

---

## 6. Testing Strategy

### New Unit Tests Needed

| Test File | Tests |
|-----------|-------|
| `tests/chatUtils.test.ts` | Fix existing tests: change `result.artifacts` to `result.files`, fix tool names to `write_artifact` (underscore). Add tests for: content tool extraction, multi-file messages, inline `antArtifact` + tool call merging. |
| `tests/useWriteArtifactStream.test.ts` | Phase transitions: `idle→intention→writing→done`, premature `isToolDone` behavior, `contentBeforeTool` edge cases (empty, undefined, very long). |
| `tests/useFilePanel.test.ts` | Versioned updates: same identifier + different content = update; same identifier + same content = skip; rollback preserves history. |
| `tests/fileParser.test.ts` | Add edge cases: unquoted attributes, empty content tags, unclosed tags, multiple tags, no-type tags, MIME type attributes. |

### Key Integration Test

**Session load from DB produces correct display messages.** This is the single most important test — it catches the double-mapping bug (Root Cause B). Steps:
1. Save message to DB via `handleChatFinish`
2. Load session via `loadSession`
3. Verify: `reasoning` is not doubled, `files` are populated correctly, `contentBeforeTool` matches original

---

## 7. Recommendation

**Proceed with Batch 1 ("Stop the Bleeding") immediately.** This is the highest-leverage, lowest-risk set of changes. It fixes:

1. **Versioned updates being silently dropped** (users see stale content)
2. **Premature "done" animation** (users think artifact is complete when it's not)
3. **Correct phase transitions** (non-deterministic behavior eliminated)

Batch 1 touches only 4 files with clear, surgical changes. It has zero backward-compatibility risk and requires no state migration.

Batch 2 and Batch 3 should follow sequentially, each verified before deploying the next.

**The work is**: establishing a single tool interface contract, enforcing that transformations are never stored back, replacing the identifier blacklist with proper versioning semantics, and fixing the streaming phase machine to correctly report completion.

---

## 8. Files to Change (Complete List)

| File | Batch | Action | Lines |
|------|-------|--------|-------|
| `src/hooks/useFilePanel.ts` | 1 | Modify | 9, 12-14, 22, 115 |
| `src/components/chat/AssistantBubble.tsx` | 1 | Modify | 52-70 |
| `src/hooks/useWriteArtifactStream.ts` | 1 | Modify | 14-19, 22-27, 46-51 |
| `src/pages/ChatPage.tsx` | 1, 2 | Modify | 198, 201-204, 231-233, 342-346 |
| `src/lib/chatUtils.ts` | 2 | Modify (split) | 172-269 |
| `core/utils/DatabaseService.ts` | 2 | Modify | 148-161 |
| `core/tools/writeArtifactTool.ts` | 3 | Modify | 4-16 |
| `packages/tool-runtime/src/builtins.ts` | 3 | Modify (add) | 49 |
| `core/tools/allTools.ts` | 3 | Modify | 12 |
| `src/lib/fileParser.ts` | 3 | Modify | 4 |
| `core/prompt/systemPrompt.ts` | 3 | Modify | 11 |
| `tests/chatUtils.test.ts` | 2 | Modify | 207-242 |
| `tests/fileParser.test.ts` | 2 | Add | — |
| `tests/useWriteArtifactStream.test.ts` | 1 | Add (new) | — |
| `tests/useFilePanel.test.ts` | 1 | Add (new) | — |
