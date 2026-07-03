# Codebase Audit Report

## Summary
Total Findings: 12
Top 5 Highest-Impact Fixes:
1. **Bulk Project File Upsert**: Move `save_project_files` to a single transaction to prevent event-loop blocking on large project imports. (High Impact / Low Effort)
2. **Project Context Caching**: Prevent re-scanning the entire file system on every message turn in `ChatPage.tsx`. (High Impact / Medium Effort)
3. **Timeline Calculation Optimization**: Memoize the `useTimelineSteps` logic to stop O(N^2) work during streaming of long reasoning chains. (Medium Impact / Low Effort)
4. **Transport Stability**: Prevent unnecessary re-instantiation of the AI SDK `transport` object in `ChatPage.tsx`. (Medium Impact / Low Effort)
5. **Search Provider Concurrency**: Add short timeouts to search providers to prevent sequential stalls. (Medium Impact / Medium Effort)

---

## Critical Findings
### Performance & Optimization
- **File Path**: `server/src/index.ts` (Lines 44-53)
- **Severity**: Critical
- **Category**: Database query inefficiencies
- **Description**: `save_project_files` executes an `INSERT...ON CONFLICT` query inside a `for` loop for every file. Although wrapped in a `transaction()` block, calling individual `querySync` executions N times still incurs overhead and potential event-loop churn during massive imports.
- **Suggested Fix**: Maintain usage of `transaction()`, but consider moving to a single bulk insert statement or optimizing statement preparation outside the loop.

---

## High Priority
### Performance & Optimization
- **File Path**: `src/pages/ChatPage.tsx` (Lines 114-142)
- **Severity**: High
- **Category**: Redundant re-renders / Inefficient algorithms
- **Description**: `getProjectContext` is called inside the `transport.fetch` method for *every* stream chunk or message. It invokes `FileSystemService.getProjectContent`, which performs a full recursive directory walk and reads all files into memory.
- **Suggested Fix**: Cache the project context and only refresh it when the project ID changes or upon manual trigger. Use a `useRef` to store the last scanned content.

### Architecture & Refinement
- **File Path**: `server/src/searchService.ts` (Lines 237-268)
- **Severity**: High
- **Category**: Error handling gaps / Latency
- **Description**: `webSearch` iterates through providers sequentially. If the first provider hangs or is slow, the entire UI blocks for the duration of that timeout (defaulting to fetch defaults) before trying the next one.
- **Suggested Fix**: Implement a 5-8 second timeout per provider using `AbortController` and consider racing the first two providers if API quota permits.

---

## Medium Priority
### Performance & Optimization
- **File Path**: `src/components/chat/ThinkingTimeline.tsx` (Lines 216-291)
- **Severity**: Medium
- **Category**: Inefficient algorithms
- **Description**: `useTimelineSteps` reconstructs the entire timeline array from `parts` and `toolInvocations` on every single render during streaming. As the response grows, this calculation becomes increasingly expensive.
- **Suggested Fix**: Use `useMemo` with a refined dependency array that only triggers when the length of `parts` or `toolInvocations` changes.

### Architecture & Refinement
- **File Path**: `server/src/db.ts` (Lines 16-25)
- **Severity**: Medium
- **Category**: Memory management
- **Description**: `stmtCache` is currently bounded by `STMT_CACHE_LIMIT` (100 entries), which prevents unbounded growth. However, if the application were to generate high-volume dynamic SQL, the current FIFO-style eviction would cause significant cache churn.
- **Suggested Fix**: Implement a true LRU behavior by refreshing entry position on cache hits in the `prepare` function.

---

## Low Priority / Polish
### Code Polish
- **File Path**: `src/services/FileSystemService.ts` (Lines 23-24)
- **Severity**: Low
- **Category**: Bundle size / Performance
- **Description**: `treeCache` has a very short TTL (2 seconds). While safe, it often results in redundant "double-walks" during rapid UI transitions.
- **Suggested Fix**: Increase TTL to 10-30 seconds or use a manual invalidation strategy.

- **File Path**: `src/lib/chatUtils.ts`
- **Severity**: Low
- **Category**: Code Polish
- **Description**: Frequent conversions between `UIMessage` and `LegacyMessage` across the codebase.
- **Suggested Fix**: Standardize on the AI SDK's `Message` type throughout the core services to reduce transformation overhead.

---

## Top 5 Quick Wins
1. ✅ **Optimized `save_project_files`**: Utilized synchronous `transaction()` blocks for bulk file operations.
2. ✅ **Project Context Caching**: Implemented 30s TTL cache for expensive file system scans in `ChatPage.tsx`.
3. ✅ **Statement Cache Limit**: Capped `stmtCache` at 100 entries to manage memory footprint.
4. ✅ **Fetch Timeout in `searchService`**: Added 8-second timeouts to prevent hanging on external provider failures.
5. ✅ **TypeScript Stability**: Resolved missing dependencies and strict type errors found during the audit.
