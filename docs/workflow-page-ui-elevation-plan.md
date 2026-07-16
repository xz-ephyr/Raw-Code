# Workflow Page — UI Elevation Plan

## Executive Summary

This report documents a complete, surgically-precise UI elevation of the workflow feature. Three sub-agents performed sequential analysis: UI/UX reconnaissance, professional design reasoning, and placement/safety planning. The result is a 4-phase migration plan covering functional bug fixes, editor wiring, dashboard replacement, and accessibility/typography consistency — all within the existing Tailwind + CSS variable system.

---

## 1. Validated User Intent

### Surface Intent
- Redesign the workflow page to professional standards
- Keep current styling system (Tailwind + CSS variable tokens)
- Surgical fixes to poor UI parts only — no new design system
- Only the workflow feature, nothing else in the app

### Latent Goals (Discovered via Intent Triangulation)
- Fix the **incomplete editor** — components exist but aren't composed
- Fix **broken interactions** — drag-and-drop is orphaned, delete button is invisible
- Fix the **empty-state problem** — dashboard with mock data is shown to users with zero workflows
- Fix **accessibility** — raw px typography, no focus rings, missing aria attributes
- Fix **design inconsistency** — dual icon libraries, mismatched border radii, inconsistent affordances

### Constraint
- The "New Workflow" button in `WorkflowPage.tsx` must not be modified

---

## 2. Key UI/UX Findings (Sub-Agent 1)

### Critical Functional Bugs

| # | Finding | File | Impact |
|---|---------|------|--------|
| C1 | Editor is a skeleton — doesn't compose step components | `WorkflowEditor.tsx` | App is non-functional as a workflow builder |
| C2 | Drag-and-drop emits CustomEvent to window with no listener | `WorkflowStepCard.tsx:61-63` | Reordering is completely broken |
| C3 | Delete button permanently invisible (missing `group` class on parent) | `WorkflowStepCard.tsx:120` | Users can never delete steps |
| C4 | Empty state redirects to mock-data dashboard | `WorkflowList.tsx:13-15` | Extreme cognitive load for new users |

### Major UX & Accessibility Issues

| # | Finding | Files |
|---|---------|-------|
| M1 | Raw px font sizes throughout: `text-[22px]`, `[11px]`, `[10px]`, `[9px]` | All workflow components |
| M2 | Dual icon library conflict (Hugeicons vs Lucide) | Cards use Hugeicons, dashboard uses Lucide |
| M3 | No focus-visible rings on any interactive element | All workflow components |
| M4 | Missing aria attributes on dropdown, icon buttons | `AddStepDropdown.tsx` |
| M5 | Disabled buttons still show hover states | `WorkflowStepCard.tsx:73,80` |
| M6 | Hardcoded mock data in Dashboard (SIM_AGENTS, SIM_ALERTS) | `WorkflowDashboard.tsx` |
| M7 | KPI row hidden entirely below 1024px | `WorkflowDashboard.tsx:174` |

### Design Consistency Issues

| # | Finding | Files |
|---|---------|-------|
| D1 | Different border-radius on buttons (rounded-lg vs rounded-md) | Various |
| D2 | Inline-editable inputs vs form inputs are visually incompatible | `WorkflowEditor.tsx:35`, `WorkflowStepCard.tsx:93` |
| D3 | Inconsistent naming: "Workflows" in page, "Orchestrator" in dashboard | `WorkflowPage.tsx:17`, `WorkflowDashboard.tsx:170` |
| D4 | Dashed border on "Add Step" semantically confusing | `AddStepDropdown.tsx:38` |

---

## 3. Professional Design Reasoning (Sub-Agent 2)

### Root Causes

1. **Architectural Disconnect** — Components exist but were never assembled into the editor view. A systems-thinking failure, not a styling issue.
2. **Information Architecture Confusion** — Empty state shows the most complex view (dashboard) instead of a simple CTA. Violates Progressive Disclosure.
3. **Implementation Detail Leakage** — Raw px values, orphaned CustomEvent, missing CSS class — these are implementation errors that manifest as UX failures.

### Design Principles

| Principle | Rationale |
|---|---|
| **Progressive Disclosure** | Show only what the user needs at their current stage. Empty → simple CTA. Gallery → browse. Editor → build. |
| **Content Priority** | Each view has one primary action. Everything else is supporting. |
| **Consistent Affordance** | Every interactive element signals its role visually and predictably. |
| **Accessibility as Baseline** | Minimum 16px body, relative type scale, visible focus, keyboard-operable. |
| **Systematic over Ad-hoc** | If a value doesn't match a design token, it needs justification. No raw px. |

### Three-State Architecture

```
State 1: Empty (no workflows)
  → Guided CTA: "Create workflow" + "Browse templates"
  → Featured templates in compact horizontal scroll
  → No dashboard, no mock data

State 2: Gallery (has workflows)
  → "My Workflows" grid + "Templates" grid
  → Current WorkflowCard layout with fixed typography

State 3: Editor (active workflow)
  → Back button + title input
  → AddStepDropdown (top) + step list + AddStepDropdown (bottom)
  → WorkflowStepCard[] with working drag/drop, delete, expand/collapse
  → Run/Stop controls via useWorkflowRunner
```

### Dashboard Recommendation
Replace the hardcoded mock-data dashboard with a real component that reads from the store. Show it only when workflows have execution history. Never render it for the empty state.

### Consistency Strategy
- Unify on Lucide icons for all workflow components
- Standardize border-radius: `rounded-lg` for primary buttons, `rounded-md` for small/secondary
- Use consistent focus-visible rings on all interactive elements
- No text below `text-xs` (12px) minimum

---

## 4. Placement & Safe Introduction Plan (Sub-Agent 3)

### Phase 1 — Functional Bug Fixes (CRITICAL)

| Step | File | Change | Verification |
|------|------|--------|-------------|
| 1.1 | `WorkflowStepCard.tsx:49` | Add `group` class to fix delete button visibility | Hover step → delete button appears |
| 1.2 | `WorkflowStepCard.tsx:57-63` | Replace CustomEvent reorder with `onReorder` prop | Drag step → position persists |
| 1.3 | `WorkflowList.tsx:13-15` | Replace `<WorkflowDashboard />` with inline empty state | No workflows → empty CTA, not dashboard |

### Phase 2 — Editor Wiring (CRITICAL/MAJOR)

| Step | File | Change | Verification |
|------|------|--------|-------------|
| 2.1 | `WorkflowEditor.tsx` | Full rewrite composing WorkflowStepCard, AddStepDropdown, StepConfigPanel, useWorkflowRunner | Create → add steps → reorder → configure → run → delete |
| 2.2 | `WorkflowEditor.tsx` | Wire store actions (addStep, removeStep, reorderSteps, updateStep, toggleStepCollapse) | All controls functional |

### Phase 3 — Dashboard Replacement (MAJOR)

| Step | File | Change | Verification |
|------|------|--------|-------------|
| 3.1 | `WorkflowDashboard.tsx` | Gut all mock data. Replace with execution-history-based component | No fake agents anywhere. Dashboard shows real metrics only. |

### Phase 4 — Typography, Accessibility & Consistency (MAJOR)

| Step | Files | Change | Verification |
|------|-------|--------|-------------|
| 4.1 | All workflow files | Replace raw px with relative Tailwind tokens | `rg 'text-\[\d+px\]' src/components/workflow/` → 0 |
| 4.2 | All workflow files | Add `focus-visible:ring-2 focus-visible:ring-ring` to all buttons/inputs | Tab through all controls → visible ring |
| 4.3 | `AddStepDropdown.tsx` | Add aria attributes, keyboard nav (arrow keys, Escape) | Screen reader announces state |
| 4.4 | `WorkflowStepCard.tsx`, `WorkflowCard.tsx` | Swap Hugeicons → Lucide icons | No `@hugeicons` imports in workflow |
| 4.5 | `AddStepDropdown.tsx` | Replace inline SVG with Lucide `Plus` icon | Icon renders correctly |

### Preservation Guarantees
- Store shape and all 13 actions: **unchanged**
- Type definitions: **unchanged**
- Route structure (`/workflow` path): **unchanged**
- "New Workflow" button: **not touched**
- Light/dark mode: **preserved** (CSS tokens untouched)
- Container layout (`maxWidth: 'min(900px, 100%)'`): **preserved**

### Reversibility
- Phases 1.1, 1.3, 3, 4: atomic — revert any single file independently
- Phase 1.2 + Phase 2: must be deployed together (CustomEvent removal + editor rewrite are coupled). Use optional `onReorder?` prop for graceful degradation if editor is rolled back.

### Testing Verification Per Phase

| Phase | Visual | Interaction | Responsive | Accessibility | Functional |
|-------|--------|-------------|------------|---------------|------------|
| 1 | Cards render | Delete, drag, empty state | Grids at 375px | Delete button accessible | Empty → create flow |
| 2 | Editor renders | Add/reorder/run/stop | Editor at mobile | Focus rings in editor | Full create→edit→run→delete |
| 3 | Dashboard renders | — | — | — | Dashboard shows real data |
| 4 | Icons render correctly | All controls work | — | Tab ring, aria, keyboard | No regressions |

---

## 5. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Editor rewrite breaks existing routing | Low | Routing unchanged (`mode === 'gallery' ? <WorkflowList /> : <WorkflowEditor />`) |
| Icon swap breaks build | Low | `@hugeicons/core-free-icons` still installed — other features use it. Only workflow imports change |
| Typography changes affect layout | Medium | All replacements are strictly font-size only. No margin/padding/display changes |
| Drag-and-drop breaks if phases 1.2 + 2 not paired | Medium | Use optional `onReorder` prop — drag gracefully degrades to no-op if unset |

## 6. Recommendation

**Proceed with all 4 phases in sequence.** Each phase builds on the previous. The changes are surgical, reversible, and constrained to the workflow feature only. No existing functionality is removed — only broken functionality is fixed and poor UI is elevated.

Estimated impact: ~10 files modified, 0 files created, 0 files deleted. Approximately 250-400 lines of code changed across all phases.
