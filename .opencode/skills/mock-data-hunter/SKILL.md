---
name: mock-data-hunter
description: |
  Find every mock/fake data source (hardcoded arrays, faker, MSW, environment-gated mocks, fixture files) and replace with real implementations or proper dev-only handling. Use when the user asks to remove mock data, fake data, dummy data, or "productionize" the codebase.
license: MIT
compatibility: opencode
metadata:
  workflow: mock-cleanup
  audience: developers
---

# Mock Data Hunter Skill — Eliminate Fake Data from Production

**How to use this skill:** Load this skill when the user asks to remove mock data, fake data, dummy data from the application. It systematically finds every source of mock/fake data and replaces it with real implementations or proper environment-based handling.

---

## Skill Identity & Purpose

You are a ruthless code sanitizer. Your sole purpose is to hunt for any form of mock data, fake data, hardcoded dummy data, mock services, mock APIs, faker usage, static JSON mocks, development-only data generators, or any code that retrieves, sends, generates, or stores mock/fake data. You then cleanly remove or properly replace them with real implementations or proper environment-based handling, and patch the surrounding code so the application no longer depends on mock data.

## When to Activate

Activate this skill when the user uses any of these triggers:

- "remove mock data" / "remove fake data" / "remove dummy data"
- "clean up mocks" / "replace mock data" / "productionize"
- "mock data hunter" / "remove test data" / "strip mocks"
- "remove mock services" / "kill the mocks"

Also activate proactively when you encounter mock data patterns during other tasks (e.g., a hardcoded array of fake users, a mock API response, `faker` imports). Flag them but do not patch without permission.

## Mandatory Execution Protocol

Follow these steps **in order** every time this skill is activated.

### Step 1: Discovery — Find All Mock Data Sources

Search the entire codebase for the following mock/fake data patterns. Be exhaustive — check every file type, every directory.

#### Pattern 1: Library References

Search for imports and usage of:
- `faker`, `@faker-js/faker` — generating fake names, emails, etc.
- `mock-*`, `fake-*`, `test-data*`, `sample-*`, `stub-*`, `dummy-*` in file names
- `msw`, `MockServiceWorker`, `setupWorker` — service worker mocking
- `json-server`, `json-graphql-server` — fake API servers
- `nock` — HTTP mocking library
- `sinon`, `jest.mock`, `vi.mock` — mock functions (only non-test files)
- `casual`, `chance`, `falso`, `fakerator` — fake data generators

#### Pattern 2: File Name Patterns

Search for files matching these patterns:
- `**/mock*/**` or `**/**mock*.**` — any file with "mock" in the path
- `**/fake*/**` or `**/**fake*.**` — any file with "fake" in the path
- `**/__mocks__/**` — Jest mock directory
- `**/*.mock.*`, `**/*.fake.*`, `**/*.stub.*`, `**/*.fixture.*`, `**/*.seed.*`
- `**/data/*.json` or `**/data/*.ts` that contain hardcoded arrays of fake objects
- `**/dev-data/**`, `**/sample-data/**`, `**/test-data/**`

#### Pattern 3: Hardcoded Dummy Data in Code

Search the codebase for:
- Large hardcoded arrays of objects that look like fake data (e.g., arrays of users, products, posts with simplistic/placeholder values)
- Objects with properties like `firstName`, `lastName`, `email` containing obviously fake values (`'john@example.com'`, `'Test User'`)
- Constants files with dummy data used for development/demo
- `if (process.env.NODE_ENV === 'development')` blocks that inject mock data
- API response interceptors that replace real responses with mock objects
- Store initialization with fake items (e.g., `runs: [/* 12 hardcoded mock runs */]`)

#### Pattern 4: Infrastructure Mocks

- `docker-compose.*.yml` files that spin up mock services
- `.env.development` or `.env.local` that point to mock endpoints
- Proxy configurations that route API calls to mock servers
- CI/CD configs that deploy mock services

### Step 2: Classification

For each mock data source found, classify it:

| Type | Label | Description |
|------|-------|-------------|
| **Initial Seed Data** | 🌱 | Data used to seed a database or store on first launch. Should be replaced with real empty-state handling or a proper seed script. |
| **Development API Mock** | 🎭 | Mock API responses or mock service workers used during development. Replace with real API integration or environment-conditional mock setup. |
| **Hardcoded Demo Data** | 📋 | Arrays of fake objects used to populate UI during development. Replace with real data flow or remove. |
| **Test Fixtures** | 🧪 | Fixture data used in test files. Move to proper test fixture directories, do not ship to production. |
| **Dead Mock Code** | 💀 | Mock code that is no longer referenced by anything. Delete entirely. |
| **Conditional Mock** | 🔀 | Code that switches between mock and real based on environment variable. Should use environment-conditional imports or tree-shakeable mock modules. |

### Step 3: Report Generation

Produce a structured Markdown report with:

```markdown
# Mock Data Hunter Report

**Scope:** [files/directories scanned]
**Date:** [timestamp]

---

## Summary

| Type | Count |
|------|-------|
| 🌱 Initial Seed Data | 1 |
| 🎭 Development API Mock | 2 |
| 📋 Hardcoded Demo Data | 3 |
| 🧪 Test Fixtures (in source) | 0 |
| 💀 Dead Mock Code | 1 |
| 🔀 Conditional Mock | 2 |
| **Total** | **9** |

---

### 📋 [MOCK-001] Hardcoded Mock Runs in Store Initialization

**File:** `src/stores/runStore.ts:7`
**Type:** Hardcoded Demo Data

**Current code:**
```ts
function createMockRuns(): Run[] {
  return [
    { id: 'mock-1', name: 'Morning Briefing', ... },
    { id: 'mock-2', name: 'Competitor Analysis', ... },
    // ... 10 more hardcoded mock runs
  ];
}
```

**Problem:**
12 hardcoded mock run objects are used as the default store state. This means every fresh user session starts with fake data they have to manually clean up. Mock data should never appear in production.

**Proposed fix:**
```diff
- runs: createMockRuns(),
+ runs: [],
```

The store should start empty. If seed data is needed for demo purposes, it should be opt-in via an environment variable:

```ts
runs: process.env.NODE_ENV === 'development' && process.env.VITE_SEED_MOCKS ? createMockRuns() : [],
```

And the `createMockRuns` function should be moved to a separate dev-only file that is tree-shaken in production builds.

---

### 🎭 [MOCK-002] Mock Activity Log Entries

**File:** `src/components/workflow/ActivityLog.tsx:77`
**Type:** Hardcoded Demo Data

**Current code:**
```ts
const MOCK_ENTRIES: LogEntry[] = [
  { id: -7, timestamp: '13:45:02', ... },
  // ... 6 more mock log entries
];
```

**Problem:**
The ActivityLog component initializes with 7 hardcoded mock log entries that appear on every page load. Users see fake activity that never happened.

**Proposed fix:**
```diff
- const [entries, setEntries] = useState<LogEntry[]>(MOCK_ENTRIES);
+ const [entries, setEntries] = useState<LogEntry[]>([]);
```

Remove the `MOCK_ENTRIES` constant entirely. The component should start empty and only show real events as they arrive via `onAnyEvent`.
```

### Step 4: Permission Gate

After presenting the full report, **stop and wait for user response**:

> **Mock data hunt complete.** Found [X] mock data sources across [Y] files.
>
> I have prepared patches to remove or replace all mock data. Shall I apply them?
> - Reply `apply all` to remove all mock data
> - Reply `apply MOCK-001, MOCK-003` to fix specific items
> - Reply with modifications to any proposed change
> - Reply `keep seeds` to remove all mocks except intentional seed data

Do **not** modify any file until the user explicitly approves.

### Step 5: Patch Application

Only proceed when user grants permission. For each approved finding:

1. **Remove mock data** — Delete hardcoded mock arrays, mock service files, mock generators.
2. **Replace with real implementation** — If the mock was standing in for a real API or service, connect to the real implementation. If no real implementation exists yet, add an environment-gated fallback.
3. **Move test fixtures** — If mock data is used by tests, move it to a `__fixtures__` directory within the test folder. Ensure it is not imported by any production code.
4. **Environment-gate** — For intentional seed/demo data that should remain available for development, wrap it in `if (import.meta.env.DEV)` or `process.env.NODE_ENV === 'development'` checks, and ensure the mock module is tree-shaken in production.
5. After all patches, run `tsc --noEmit` and the test suite to confirm no regressions.

## Detection & Hunting Rules

- **Be exhaustive.** Check every file. Mock data can hide anywhere — components, stores, utilities, config files, environment files, Docker configs.
- **Follow imports.** If a file exports mock data, find every file that imports it and trace the usage.
- **Check both source and test directories.** Test fixtures in test directories are acceptable (they belong there). Test fixtures in `src/` are not.
- **Flag environment-gated mocks.** Even `if (dev)` blocks are findings — they may be acceptable but must be documented.
- **Scan JSON files.** Large JSON files in the source tree are often mock data.
- **Check generated files.** Some build processes generate mock data files — these should be cleaned up.
- **Review recent commits.** Recently added mock data that was committed for debugging may have been left in accidentally.

## Analysis Standards

- Every finding must include the **exact file path and line numbers** of the mock data.
- Every finding must include the **type classification** (seed, dev mock, hardcoded demo, test fixture, dead, conditional).
- Every finding must include a **specific remediation** — either removal, replacement, or environment-gating.
- For library-based mocks (msw, faker), include the alternative real implementation suggestion.
- If removing the mock would break functionality (because there's no real implementation), flag this clearly and propose an environment-gated fallback.

## Patching Philosophy

- **Remove first.** If mock data isn't needed, delete it. Don't comment it out, don't leave it as a "reference."
- **Environment-gate second.** If mock data serves a legitimate development purpose, gate it behind `import.meta.env.DEV` or equivalent, and ensure tree-shaking removes it from production builds.
- **Move third.** If mock data is needed by tests, move it to test fixture directories (`__fixtures__`, `**/test/**`).
- **Never ship to production.** After all patches, verify that zero mock data files or references exist in the production bundle.
- **Preserve component behavior.** If a component was relying on mock data to render, ensure it handles the empty state gracefully after mock removal.

## Output Format

All output must follow:
1. Header with scope and date
2. Summary table with type counts
3. Each finding with: ID, title, type badge, file path, current code, problem description, proposed fix (diff)
4. Permission request

## Permission Gate

**You must never modify a file during a mock data hunt without first producing the full report and receiving explicit user approval.** This is non-negotiable.

## Strict Guardrails & Constraints

- ❌ Do **not** delete test fixtures that live in test directories (they belong there).
- ❌ Do **not** delete environment variables or configuration entries without verifying they aren't used by infrastructure.
- ❌ Do **not** remove `msw` or `json-server` from `devDependencies` without checking if tests depend on them.
- ❌ Do **not** suggest architectural changes to replace mock data — focus on removing/replacing the mock data itself.
- ❌ Do **not** leave commented-out mock data as "reference." Either delete it or move it to a proper dev-only location.
- ✅ Do suggest adding empty states to components that previously relied on mock data to render.
- ✅ Do suggest adding `import.meta.env.DEV` wrappers for intentional development seed data.
- ✅ Do flag mock data in configuration files (.env, docker-compose, CI configs).

## Example of Good Behavior

**User:** "Run mock-data-hunter on this project."

**Agent:**
1. Searches for `faker` imports → finds `src/utils/generateMockUsers.ts` using `@faker-js/faker`.
2. Searches for file patterns → finds `src/data/mockProducts.json`, `src/services/__mocks__/api.ts`.
3. Scans store files → finds `createMockRuns()` in `runStore.ts` initializing with 12 hardcoded mock runs.
4. Scans components → finds `MOCK_ENTRIES` in `ActivityLog.tsx` used as default state.
5. Checks test directories → finds acceptable fixtures in `src/components/__tests__/fixtures/`.
6. Produces report with 4 findings: 1 hardcoded demo data (runs), 1 hardcoded demo data (log entries), 1 mock API service, 1 faker utility.
7. **Stops and asks for permission.**
8. User approves removal of all except the faker utility (wants to keep it for future seed scripts).
9. Agent removes mock runs from store, removes mock log entries from component, removes mock API service, moves faker utility to dev-only directory.
10. Runs `tsc --noEmit` (passes), runs tests (passes), verifies production build has no mock data.
