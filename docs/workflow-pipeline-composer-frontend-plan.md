# Workflow Pipeline Composer — Frontend UI Plan

## Validated User Intent

### Surface Intent
Build a visual Workflow Page that orchestrates and automates content creation by composing six core primitives: **tool call, sub-agent, connector, skills, MCP, LLM** — UI first, backend integration deferred.

### Latent Intent
- Need a pipeline builder that feels like a design surface, not just a config form
- The page should integrate with the existing sidebar navigation, layout, and design system
- Eventually connect to the existing `packages/tool-runtime/src/plan/` plan engine (create-plan, execute-plan, plan-store)
- The six primitives should be first-class citizens with distinct visual identities
- Workflows should be persistable locally so the UI works without any backend

### Constraints
- UI-only: no backend calls, no Effect.ts in the frontend store
- Pure React 19 + TypeScript + Tailwind + zustand
- Must not modify any existing files except `src/pages/WorkflowPage.tsx`
- All new components live under `src/components/workflow/`

---

## Key Findings (Sub-Agent 1)

### Current Frontend Architecture
| Area | Finding |
|------|---------|
| **Layout** | `flex h-screen overflow-hidden` → `Sidebar` + `<main><Outlet />` |
| **Page pattern** | `flex-1 bg-background overflow-y-auto thin-scrollbar` → `mx-auto px-6 py-8` max `1200px` |
| **Header** | `text-[22px] font-semibold text-foreground tracking-tight` + subtitle `text-sm text-muted-foreground mt-1` |
| **Tabs** | `SubTabNav` component: `border border-border rounded-lg p-0.5` with active `bg-muted text-foreground` |
| **Cards** | `border border-border rounded-lg p-3 hover:bg-muted transition-colors cursor-pointer` |
| **Grids** | `grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3` |
| **Icons** | `@hugeicons/core-free-icons` via `<HugeiconRenderer icon={IconName} size={18} />` |
| **State** | zustand, `persist` middleware for localStorage, no backend calls |
| **Utils** | `cn()` from `@/lib/utils`, `formatRelativeTime()` for timestamps |
| **Sidebar** | Already has Workflow tab at `/workflow` with `CursorRectangleSelection02Icon` |
| **Routing** | HashRouter, lazy-loaded `WorkflowPage` with named export, route unchanged |

### Existing WorkflowPage
**`src/pages/WorkflowPage.tsx`** — empty 3-line shell:
```tsx
export const WorkflowPage = () => (
  <div className="p-6 bg-background flex-1 relative" />
);
```

### Plan Engine (Reference Only — Backend Deferred)
```ts
interface PlanStep { id: string; description: string; toolName?: string; expectedInput?: Record<string, unknown>; }
interface Plan { planId: string; title: string; steps: PlanStep[]; status: 'pending'|'approved'|'rejected'|'modified'; }
```

---

## Professional Reasoning & Correct Approach (Sub-Agent 2)

### Core UX Definition
The Workflow Page is a **template-first step-list pipeline composer** with two modes:

1. **Gallery (default)**: Browse pre-built templates + user's saved workflows in a grid
2. **Editor**: Add, configure, reorder, and remove steps in a collapsible accordion list

**Rejected approaches:**
- ❌ Visual node/graph editor (over-engineered for v1, no branching needed)
- ❌ Step-by-step wizard (too rigid, poor reordering UX)
- ❌ PluginTabs clone (that's a browse/install interface, not a builder)

### Six Primitives — UI Representation
All six are implemented as **step types** in a unified list, each with a distinct config panel:

| Type | Icon Concept | Config Fields | Preconditions |
|------|-------------|---------------|---------------|
| `tool_call` | Function/play | Tool name, input params | None |
| `sub_agent` | Robot/spark | Task description, personality, model, max steps | LLM provider configured |
| `connector` | Plug/link | Connector picker, action | OAuth authenticated |
| `llm` | Chip/brain | Model selector, temperature, max tokens, system prompt | API key configured |
| `skill` | Star/bag | Skill toggle, feature flags | None (UI-only) |
| `mcp` | Globe | Server URL, transport — **Coming soon** | Not implemented |

### Workflow Data Model
```ts
type StepType = 'tool_call' | 'sub_agent' | 'connector' | 'llm' | 'skill' | 'mcp';

interface WorkflowStep {
  id: string;
  type: StepType;
  label: string;
  description?: string;
  config: Record<string, unknown>;
  collapsed: boolean;
}

interface Workflow {
  id: string;
  title: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}
```

Maps cleanly to the Plan engine: `WorkflowStep → PlanStep` by mapping `type + config` → `toolName + expectedInput`.

### Key Design Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Composition model | Sequential step-list | No branching/conditionals in v1; 80% use case |
| Reordering | HTML5 DnD (no library) | Avoids adding a dep; can upgrade to `@dnd-kit` later |
| State | zustand + persist | Matches existing pattern (`sessionStore.ts`) |
| Execution | Simulated (mock delays) | Exercises full UI (loading, error, success states) |
| Templates | Hardcoded JS array | Zero backend; same pattern as `CONNECTOR_CATEGORIES` |
| Input mapping | Stored, auto-linked, no editor | Future v2 feature |

---

## Precise Placement & Introduction Plan (Sub-Agent 3)

### Files to CREATE (13 new files)

```
src/types/workflow.ts                           — Workflow, WorkflowStep, StepType types
src/data/workflowTemplates.ts                   — Hardcoded template definitions
src/stores/workflowStore.ts                      — zustand store with persist
src/hooks/useWorkflowRunner.ts                   — Simulated execution hook
src/components/workflow/
├── WorkflowList.tsx                             — Template gallery + saved workflows grid
├── WorkflowCard.tsx                             — Single card (title, step count, timestamp, run)
├── WorkflowEditor.tsx                           — Detail/edit view with step list
├── WorkflowStepCard.tsx                         — Collapsible step card, drag handle, status dot
├── AddStepDropdown.tsx                          — Dropdown to pick primitive type
├── StepConfigPanel.tsx                          — Switch dispatcher to type-specific config
├── primitive-configs/
│   ├── ToolCallConfig.tsx
│   ├── SubAgentConfig.tsx
│   ├── ConnectorConfig.tsx
│   ├── LLMConfig.tsx
│   ├── SkillConfig.tsx
│   └── MCPConfig.tsx
```

### Files to MODIFY (1 file)
- **`src/pages/WorkflowPage.tsx`** — Replace empty `<div>` with full page shell importing `WorkflowList` and `WorkflowEditor`

### Files that REMAIN UNCHANGED
- `src/app/App.tsx` — lazy import of `WorkflowPage` named export unchanged
- `src/pages/index.tsx` — barrel export `WorkflowPage` unchanged
- `src/components/sidebar/Sidebar.tsx` — `/workflow` nav unchanged
- All existing stores, hooks, components, types, utils

### Implementation Order (5 Phases)

**Phase 1 — Foundation** (no component deps on each other)
1. `src/types/workflow.ts`
2. `src/stores/workflowStore.ts`
3. `src/data/workflowTemplates.ts`
4. `src/hooks/useWorkflowRunner.ts`

**Phase 2 — Gallery UI**
5. `src/components/workflow/WorkflowCard.tsx`
6. `src/components/workflow/WorkflowList.tsx`

**Phase 3 — Editor primitives**
7. `src/components/workflow/AddStepDropdown.tsx`
8. `src/components/workflow/primitive-configs/ToolCallConfig.tsx`
9. `src/components/workflow/primitive-configs/SubAgentConfig.tsx`
10. `src/components/workflow/primitive-configs/ConnectorConfig.tsx`
11. `src/components/workflow/primitive-configs/LLMConfig.tsx`
12. `src/components/workflow/primitive-configs/SkillConfig.tsx`
13. `src/components/workflow/primitive-configs/MCPConfig.tsx`
14. `src/components/workflow/StepConfigPanel.tsx`

**Phase 4 — Editor shell**
15. `src/components/workflow/WorkflowStepCard.tsx`
16. `src/components/workflow/WorkflowEditor.tsx`

**Phase 5 — Integration**
17. `src/pages/WorkflowPage.tsx` (the one modified file)
18. Type-check: `npx tsc --noEmit`

### Impact Radius
| File | Deps | Breakage Risk |
|------|------|---------------|
| All new files | Only `@/types/workflow`, `@/lib/utils`, zustand | **None** — no existing imports |
| `WorkflowPage.tsx` | New components only | **Low** — export signature unchanged, lazy import in App.tsx works |

### Guardrails
- No imports from `core/` or `packages/` (backend integration deferred)
- No new npm packages (use HTML5 DnD, built-in `crypto.randomUUID()`)
- All new paths use `@/` alias (already configured in `tsconfig.json`)
- Follow naming conventions: PascalCase components, camelCase hooks/stores
- Use `cn()` from `@/lib/utils` for Tailwind class merging

---

## Risks, Trade-offs & Recommendations

### Risks
| Risk | Mitigation |
|------|-----------|
| Step-list too simple for complex DAG workflows | Sequential covers 80% of content pipelines; DAG is a v2 concern |
| HTML5 DnD has mobile quirks | Acceptable for v1 desktop (Tauri app); upgrade to `@dnd-kit` if needed |
| No backend = no real execution | Mock runner exercises all UI states (loading, error, empty, success) |
| Six primitives may be confusing without docs | Templates show real usage patterns as learning examples |

### Testing Strategy
- `npx tsc --noEmit` for type safety
- Manual verification of all states: empty, template gallery, editor with steps, drag-reorder, simulated run, collapse/expand, delete step, delete workflow
- No unit tests required for this UI-first phase (no business logic beyond store operations)

### Rollback
- Revert `src/pages/WorkflowPage.tsx` to the 3-line `<div>` shell
- Delete `src/components/workflow/`, `src/types/workflow.ts`, `src/stores/workflowStore.ts`, `src/hooks/useWorkflowRunner.ts`, `src/data/workflowTemplates.ts`

---

## Recommendation

**Proceed with implementation.** The plan is conservative (single modified file, 13 new files in isolated directories), all patterns match the existing codebase exactly, and the design defers all backend complexity. The resulting page delivers immediate visual value — users can browse templates, build and configure workflows, and see simulated execution — with a data model that maps 1:1 to the existing Plan engine when backend integration begins.

---

## Executive Summary

The Workflow Page becomes a **template-first step-list pipeline composer** in two views:

- **Gallery view**: Grid of pre-built templates + user's saved workflows. Pick a template to edit, or start blank.
- **Editor view**: Drag-reorderable accordion list of steps. Each step is one of the 6 primitives (tool call, sub-agent, connector, LLM, skill, MCP) with a dedicated config panel. Run button triggers a simulated execution with real loading/success/error states.

13 new files, 1 modified file, 5 phases. Zero backend. Zero new dependencies. Full backward compatibility.

**Shall I proceed with Phase 1 implementation?**
