# Agent Skills Suite

Four specialized agent skills for raw-code, covering security, code quality, performance, and data integrity. Each skill is a self-contained Markdown file in its own subdirectory under `.opencode/skills/`.

---

## Quick Reference

| Skill | Directory | Trigger Keywords | What It Does |
|-------|-----------|------------------|--------------|
| Security Audit & Fixes | `security-audit-and-fixes/` | "security", "vulnerability", "audit", "safe", "protect" | Hunts for XSS, injection, secret leaks, auth flaws, and 11 other vulnerability categories. Produces a risk-scored report with CVSS-like labels and surgical patches. |
| Pro Dev | `pro-dev/` | "clean up", "refactor", "professional", "code quality", "structure", "reorganize" | Merges file-structure optimization (overlarge files > 300 lines) with bug/clean-code hunting. Produces a unified refactoring report. |
| Optimization | `optimization/` | "optimize", "performance", "faster", "bundle size", "load time" | Systematic performance audit across 10 categories (bundle, rendering, data fetching, computation, state, assets, network, startup, memory, build). Impact-rated before/after analysis. |
| Mock Data Hunter | `mock-data-hunter/` | "mock data", "fake data", "remove mocks", "productionize" | Finds every mock/fake data source (hardcoded arrays, faker, MSW, environment-gated mocks) and replaces with real implementations or proper dev-only handling. |

---

## When to Use Each

### Start Here: Pro Dev
Run **Pro Dev** first on any codebase you're not familiar with. It will:
1. Find over-large files (> 300 lines) that should be split
2. Hunt for common bugs (10 classes including stale closures, race conditions, incorrect null handling)
3. Detect dead code, copy-paste patterns, and commented-out code
4. Produce a single merged report with both structural and bug findings

### Then: Security Audit
Run **Security Audit** after Pro Dev cleanup. It will:
1. Scan for 15 vulnerability categories (XSS, injection, secret leaks, etc.)
2. Rate each finding as CRITICAL / HIGH / MEDIUM / LOW
3. Apply surgical fixes with zero behavioral changes

### Then: Mock Data Hunter
Run **Mock Data Hunter** before any production deployment. It will:
1. Discover all mock data sources (hardcoded arrays, faker, MSW, conditional mocks)
2. Remove or environment-gate each one
3. Ensure production builds contain zero mock data

### When Needed: Optimization
Run **Optimization** on a per-feature basis or when you notice performance issues. It will:
1. Measure baseline (bundle size, render time, API call chains)
2. Hunt across 10 performance categories
3. Produce impact-rated findings with estimated savings
4. Apply only the optimizations you approve

---

## Directory Structure

```
.opencode/skills/
├── skills-suite-readme.md
├── security-audit-and-fixes/
│   └── SKILL.md
├── pro-dev/
│   └── SKILL.md
├── optimization/
│   └── SKILL.md
└── mock-data-hunter/
    └── SKILL.md
```

---

## Architecture Notes

Each skill follows the same structure:
- **Identity & Purpose** — role definition
- **When to Activate** — trigger keywords
- **Mandatory Protocol** — strict step-by-step execution
- **Permission Gate** — must report before modifying any file
- **Strict Guardrails** — constraints that must not be violated

The permission gate is the most important structural element. Every skill produces a full report first, then **stops and waits for user approval** before making any changes. This ensures the user always retains control over what gets modified.
