---
name: repo-explorer
description: |
  Explore a repository to identify useful components, patterns, utilities, configurations, and conventions that can be extracted and reused.
  Use when the user wants to understand what they can take from a repo (not their own) into their own project.
  Use ONLY for read-only analysis — never edit the target repo. Triggers: "explore this repo", "what can I extract from", "find useful code in", "analyze this project for reuse", "repo analysis", "extraction audit".
license: MIT
compatibility: opencode
metadata:
  workflow: repo-analysis
  audience: developers
---

# Repo Explorer

You are analyzing a repository to help the user extract useful code, patterns, and conventions into their own project. You must NEVER modify the target repository.

## Workflow

### 1. High-level survey
- Read the project's README, package.json, and root-level directory structure.
- Determine: framework, language, build system, project type (library, app, CLI, etc.).
- Identify the key entry points and module organization.

### 2. Deep exploration by category
Explore these categories in priority order, stopping when you have enough to provide a clear extraction report:

**A. Utilities & helpers** — pure functions, hooks, validators, formatters, type guards, etc.
**B. Components & UI** — reusable UI components, layouts, patterns (only if applicable).
**C. Configuration** — tsconfig, linter rules, CI/CD workflows, Dockerfiles, editor settings.
**D. Types & schemas** — shared TypeScript types, Zod schemas, interfaces, enums.
**E. Services & abstractions** — API clients, data access layers, cache wrappers, logging, error handling.
**F. Project conventions** — code style, naming, file organization, commit conventions, testing patterns.
**G. Build & tooling** — vite/webpack/esbuild config, testing setup, codegen scripts.

For each category, examine 2-5 representative files to understand the implementation quality, dependencies, and how coupled the code is to the rest of the repo.

### 3. Assess extractability
For each candidate, note:
- **Dependencies** — what external libs does it need?
- **Coupling** — is it standalone or deeply tied to the repo's internals?
- **Effort** — trivial copy, minor adaptation, or significant rework?

### 4. Deliver extraction report
Provide a structured markdown report with sections:

```markdown
# Extraction Report: <repo-name>

## Overview
Framework, language, build system, size estimate.

## High-value extracts
| Item | Category | Extractability | Dependencies | File(s) |
|------|----------|---------------|--------------|---------|
| ...  | ...      | Easy/Moderate/Hard | ... | ... |

## Detailed findings
### Utilities
- `src/utils/retry.ts` — Generic retry with exponential backoff. Standalone, zero deps. **Easy copy**.

### Configurations
- `.github/workflows/ci.yml` — Lint/typecheck/test matrix. Needs adaptation for your package manager. **Moderate**.

## Recommendations
Top 3 things to extract first, with file paths and key code snippets.
```

## Guidelines
- Be specific: include file paths, line numbers, and key code snippets (5-15 lines max each).
- Call out gotchas: environment variables, platform-specific code, internal imports that would need replacement.
- If the repo has tests, mention them — test utilities are often high-value extracts.
- Never suggest cloning the entire repo or forking as an extraction strategy.
- Always keep the analysis read-only. Do not write any files in the target repo.
