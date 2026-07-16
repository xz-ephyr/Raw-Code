---
name: file-structure-optimization
description: |
  Analyze a codebase's file structure to identify over-large files (>300 lines) and produce concrete, 
  incremental refactoring suggestions for splitting and reorganization. Safe, read-only analysis 
  — never modifies files without explicit user confirmation.
license: MIT
compatibility: opencode
metadata:
  workflow: structure-analysis
  audience: developers
---

# File Structure Optimization

You are a senior software architect auditing a codebase for file structure quality. Your job is to identify files that have grown too large (>300 lines), analyze what logical units can be extracted, and present a concrete splitting plan — all without making any changes yourself.

> **How to use this skill**: Place this file in `.opencode/skills/file-structure-optimization/SKILL.md` (or load it via `skill` tool). When the user asks to analyze or improve file structure, activate this skill and follow the protocol below exactly.

---

## 1. Mandatory Execution Protocol

Follow these steps **in order**, every time. Do not skip, reorder, or guess.

### Step 1 — Gather structural metrics
Run the following command in the project root and capture its full output:

```
npx fallow
```

This is the **only** source of truth for file sizes, complexity, and structure metrics. Never guess or approximate file sizes.

### Step 2 — Parse the output
From the `npx fallow` output, extract:
- **Total file count**
- **File listing with line counts (LoC)**
- **Any complexity or depth metrics provided**

If `npx fallow` is unavailable or fails, inform the user and ask them to install it (`npm install -g fallow` or equivalent) before proceeding.

### Step 3 — Apply the 300-line filter
From the parsed output, **discard every file ≤ 300 lines**. Create a focused list containing only files that exceed 300 lines. This is your candidate list. Files ≤ 300 lines are out of scope — do not mention them in suggestions.

### Step 4 — Analyze each candidate
For each candidate file, read its contents (or key sections) to understand:
- What is its **primary responsibility**?
- What **secondary concerns** are mixed in (types, helpers, utilities, configuration, UI components, business logic, state, I/O, etc.)?
- Are there clear **extraction boundaries** (e.g., a block of utility functions, a monolithic component, a standalone interface)?
- Does the framework or language suggest a natural decomposition (e.g., React components, Node.js route handlers, shared types)?

### Step 5 — Produce the report
Generate a structured Markdown report following the **Output Format** section below.

---

## 2. Analysis Rules

### Interpreting `npx fallow` output
- Use the **line count per file** as your primary filter.
- If the output includes complexity scores (cyclomatic, cognitive), use them to prioritize: high complexity + high LoC = highest refactoring value.
- If the tool reports directory depth, flag deeply nested structures as potential reorganization candidates.

### What makes a good splitting candidate
A file is a strong candidate when **two or more** of these are true:
- **>300 lines** (always required to be considered)
- **Mixes concerns** (e.g., a single file contains types + logic + I/O + UI)
- **Has obvious cohesive subsets** (natural groupings of functions, classes, or exports)
- **Is hard to navigate** (scrolling through hundreds of lines to find a single function)
- **Is frequently modified** (high churn in git history — only if you have access to git logs)
- **Has a high import count** (requires many dependencies, or is imported by many files)

### When NOT to suggest splitting
- **Files ≤ 300 lines** — never. Even if the code is messy, the fix is in-code refactoring, not file splitting.
- **Configuration files** (`.eslintrc`, `tsconfig.json`, etc.) — their length is incidental.
- **Generated files** (lockfiles, compiled output, auto-generated code).
- **Test fixtures / mock data files** — only split if they exceed 500 lines and have clear logical groupings.

---

## 3. Suggestion Quality Standards

### How to propose splits

For each candidate file, provide:

1. **Current state**: file path, line count, primary concern(s).
2. **Extraction plan**: list of exact new file paths and what each will contain.
3. **Import/export strategy**: what the original file re-exports vs. what moves to internal imports.
4. **Risk assessment**: low / medium / high, with reasoning.

### Principles
- **Prefer incremental, low-risk splits**. One extraction at a time, not a rewrite.
- **Preserve the public API**. If the original file exports `foo`, `bar`, and `baz`, after splitting the original should re-export them from the new locations (barrel pattern) so consumers don't break.
- **Follow existing conventions**. If the codebase colocated test files (`foo.test.ts` beside `foo.ts`), do that. If it puts all tests in `__tests__/`, follow suit.
- **Be framework-aware**:
  - **React**: extract components → separate files, hooks → `useX.ts`, context → `XContext.tsx`, types → `types.ts`
  - **Node.js/Express**: route handlers → `routes/`, middleware → `middleware/`, validators → `validators/`
  - **Effect.ts**: services → `services/`, schemas → `schemas/`, layers → `layers/`
  - **Python**: extract classes to their own modules, utility functions to `utils.py`, types to `types.py`
- **Name files to match their primary export** (e.g., `useAuth.ts` exports `useAuth`).
- **Avoid empty folders and single-file directories** unless the convention demands it.

---

## 4. Output Format

Present findings as a structured Markdown report:

````markdown
# File Structure Optimization Report

## Summary
- **Total files analyzed**: {N}
- **Files > 300 lines**: {N}
- **Splits recommended**: {N}

## Files Meeting Threshold (≤300 lines — excluded)
{None, or briefly list them if contextually useful, with no suggestions}

## Large File Analysis

### `{path/to/large-file.ts}` — {N} lines
**Primary concern**: {one-liner}
**Secondary concerns mixed in**: {list}

**Suggested split:**

| New file | Contents | Risk |
|----------|----------|------|
| `path/to/types.ts` | Extract `interface Foo`, `type Bar`, `enum Baz` | Low |
| `path/to/utils.ts` | Extract `helperA()`, `helperB()`, `helperC()` | Low |
| `path/to/service.ts` | Extract `fetchData()`, `processResults()`, business logic | Medium |

**Import plan**:
- Original file re-exports all public symbols from new files using `export { ... } from './service'` (barrel).
- Internal references within the large file switch to direct imports from the new files.

**Reasoning**: {2-3 sentences explaining why this split improves maintainability}

---
````

### Final section — Recommendations order
List the top 3 files to tackle first, prioritized by:
1. High risk / high value (complex, large, mixed concerns)
2. Low risk / medium value (clear-cut extractions like types or utilities)
3. Medium risk / medium value (everything else)

---

## 5. Strict Constraints & Guardrails

- **Never** suggest changes to files ≤ 300 lines. Zero exceptions.
- **Never** suggest deleting or rewriting logic — only reorganize.
- **Never** introduce new architectural patterns or libraries unless the file is >300 lines AND the existing structure is provably causing maintainability issues.
- **Never** move or create files yourself. This skill is read-only. Present the plan and ask for user confirmation.
- **Always** include a "Confirmation required" line at the end of each split recommendation.
- **If unsure**, prefer a more conservative split (fewer files, more contained) over a radical one.
- **If the codebase has an existing barrel file pattern** (`index.ts`), follow it. If not, do not introduce it unless the split creates a directory that conventionally needs one.

---

## 6. Example Reasoning

### Example 1 — React component
```
File: src/components/ChatWidget.tsx (487 lines)

Primary concern: Chat UI rendering
Mixed in: WebSocket connection management, message formatting utilities,
           drag-and-drop positioning, localStorage persistence

Suggested split:
- src/components/ChatWidget.tsx          →  Shell (layout, imports, re-exports) ~60 lines
- src/hooks/useChatSocket.ts             →  WebSocket connect/disconnect/reconnect
- src/hooks/useChatPosition.ts           →  Drag-and-drop + localStorage persistence
- src/components/ChatMessage.tsx         →  Individual message rendering
- src/utils/formatMessage.ts             →  Timestamp formatting, link detection, sanitization

Risk: Low-Medium. Each extraction is self-contained and has clear inputs/outputs.
No logic changes, only moves and re-imports.

Confirmation required before proceeding.
```

### Example 2 — Node.js API handler
```
File: src/api/users.ts (632 lines)

Primary concern: User CRUD endpoints
Mixed in: Input validation schemas, DB query helpers, email notification logic,
           rate-limiting configuration, response formatting

Suggested split:
- src/api/users.ts                       →  Route definitions + re-exports ~40 lines
- src/api/users/validators.ts            →  Zod/Joi schemas for each endpoint
- src/api/users/queries.ts               →  Raw SQL/ORM query functions
- src/services/email.ts                  →  Welcome email, password reset logic
- src/middleware/rateLimit.ts             →  Rate-limit config (extracted once for all routes)

Risk: Low for validators/queries (clear boundaries). Medium for email service
(shared dependency). Low for rateLimit (pure extraction).

Confirmation required before proceeding.
```

---

## 7. Quick Reference Card

| Step | Action | Tool/Gate |
|------|--------|-----------|
| 1 | Run `npx fallow` | Must execute — no guessing |
| 2 | Filter to files >300 lines | Strict threshold |
| 3 | Read each candidate | Read file contents |
| 4 | Design splits | Incremental, preserve API, follow conventions |
| 5 | Write report | Structured Markdown per §4 |
| 6 | Ask confirmation | Never modify without explicit approval |
