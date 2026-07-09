# Issue ID: S01
# Slug: memory-isolation-per-project
# Status: DONE
# Discovered: 2026-07-09T13:30:00Z
# Fixed: 2026-07-09T13:46:00Z

## Description
Each project must have its own isolated memory namespace. Memory must never leak between projects. Memory must be deleted when project is deleted.

## Root Cause
N/A — architecture review found the existing implementation already supports this:
- SQLite `project_memory` table uses `PRIMARY KEY (project_id, key)` — inherently per-project
- `ON DELETE CASCADE` from `projects` table ensures cleanup on project deletion
- All server endpoints require `projectId`
- `aiService.ts` correctly fetches per-project memory and filters by `projectId`
- `projectMemory.ts` delegates to `DatabaseService` which sends `projectId` with every request

## Fix Applied
No code changes needed for the core isolation — it was already correct. Added:
- `tests/memoryIsolation.test.ts` — 7 tests verifying cross-project isolation, scoped CRUD, key collision safety, and project-scoped clearing

## Sub-Plan
- [x] Audit current memory storage layer — found SQLite with project-scoped FK, ON DELETE CASCADE, per-project API
- [x] Create ProjectMemoryStore class/module — already exists as `core/memory/projectMemory.ts`
- [x] Namespace all memory keys as `mem:{projectId}:{key}` — achieved via `PRIMARY KEY (project_id, key)` in SQL
- [x] Hook project deletion → purge — achieved via `ON DELETE CASCADE` FK constraint
- [x] Add isolation test — wrote `tests/memoryIsolation.test.ts` (7 tests, all pass)
- [x] Update memory read/write calls — all consumers already pass projectId

## Verification
Run: `npx vitest run tests/memoryIsolation.test.ts` — all 7 tests pass

## Agent Notes
The existing memory architecture is robust. The only gaps are:
1. No dedicated UI to review/approve auto-discovered memory entries before they're shown to the model
2. No fallback if server is down (memory ops fail if Express is unreachable)
3. No memory versioning/history
