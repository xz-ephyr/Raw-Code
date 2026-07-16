# Workflow Pipeline Canvas — Redesign Blueprint

> Status: Draft / Design Doc (not implemented)
> Phase: Future iteration after current UI-first step-list

---

## Current State Assessment

The v1 workflow page is a step-list pipeline composer with collapsible config panels and simulated execution. It functions correctly but fails on UX: it reads as a generic todo list, not a creative orchestration canvas. The six primitives (tool call, sub-agent, connector, LLM, skill, MCP) lack distinct visual identities. There is no sense of data flow, no pipeline visualization, and no content-creation identity.

---

## Design Principles

1. **The canvas must communicate flow** — a sequence should be readable at a glance as a pipeline, not a checklist
2. **Each primitive must have a unique, memorable visual identity** — shape, color, interaction pattern
3. **Context is king** — config panels should be alive, not static forms (show real tool lists, connector statuses, model pickers)
4. **Templates should be appetizing** — show a miniature preview of the pipeline shape, not just text
5. **Execution should be visceral** — steps glow, pulse, show timing; the user feels the pipeline working

---

## Proposed Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [← Workflows]  Workflow Title                 [▶ Run] [⋮]   │
├────────────┬──────────────────────────────────┬─────────────┤
│            │                                  │             │
│ PRIMITIVE  │    PIPELINE CANVAS               │  INSPECTOR  │
│  PALETTE   │                                  │  (slides    │
│            │   ┌─── Tool Call ────┐            │   open on   │
│  ▷ Tool    │   │  Web Search     │            │   step      │
│  ◇ SubAgt  │   │  (parameters)   │            │   click)    │
│  ⊕ Conn    │   └───────┬─────────┘            │             │
│  ⊞ LLM     │           │ (arrow)              │  Tool Name  │
│  ⋆ Skill   │           ▼                      │  ┌────────┐ │
│  ⊙ MCP     │   ┌─── Sub-agent ──┐            │  │web_srch│ │
│            │   │  Researcher    │            │  └────────┘ │
│            │   │  (personality) │            │             │
│            │   └───────┬─────────┘            │  Params:   │
│            │           │                      │  ┌────────┐ │
│            │           ▼                      │  │query    │ │
│            │   ┌─── Write Art. ─┐            │  └────────┘ │
│            │   │  Output: ...   │            │             │
│            │   └────────────────┘            │             │
│            │                                  │             │
│            │     [ + Add Step ]               │             │
│            │                                  │             │
├────────────┴──────────────────────────────────┴─────────────┤
│ Status bar: step 3/5 • running • 2.3s elapsed               │
└─────────────────────────────────────────────────────────────┘
```

### Zones

| Zone | Width | Behavior |
|------|-------|----------|
| **Primitive Palette** | Collapsible left sidebar (~48px expanded ~180px) | Drag-from source for new steps. Shows all 6 primitives with shapes + short descriptions. Only visible in editor mode. |
| **Pipeline Canvas** | Flexible (fills remaining space) | The main work area. Steps render as connected nodes in a vertical or winding path. Arrows show data flow direction. |
| **Inspector** | Right slide-over (~320px) | Opens when a step is clicked. Shows rich, context-aware config panel. Dismisses by clicking canvas or pressing Escape. |

---

## Primitive Visual Identities

| Primitive | Shape | Color | Icon | Node Style |
|-----------|-------|-------|------|------------|
| **Tool Call** | Rounded rectangle ▷ | Blue (#3b82f6) | Function/play icon | `rounded-xl border-l-4 border-blue-500` |
| **Sub-agent** | Diamond ◇ | Purple (#8b5cf6) | Robot/sparkle icon | `rotate-45 square` mask or `clip-path` diamond |
| **Connector** | Pill with circle ⊕ | Green (#22c55e) | Plug/link icon | `rounded-full border-2 border-green-500` |
| **LLM** | Squared card ⊞ | Amber (#f59e0b) | Chip/brain icon | `rounded-lg border-t-4 border-amber-500` |
| **Skill** | Star outline ⋆ | Orange (#f97316) | Star/bag icon | `rounded-lg border border-dashed border-orange-500` |
| **MCP** | Circle ⊙ | Teal (#14b8a6) | Globe/antenna icon | `rounded-full border border-teal-500` |

### Node Anatomy (each step card)

```
┌──────────────────────────────────────────┐
│ [Drag] Step 1    ⊞ LLM          [×] ⋮   │ ← Header: handle, index, type badge, actions
│──────────────────────────────────────────│
│  Configure Claude Sonnet                 │ ← Collapsed: step description / summary
│  Model: claude-sonnet-4                  │
│──────────────────────────────────────────│
│ ○ idle      2:34ms                       │ ← Status dot + last execution time
└──────────────────────────────────────────┘
```

When **expanded** (in place or via Inspector), the bottom section shows the config panel. The card bakes in as much info as possible in collapsed state so the pipeline is readable without expanding.

---

## Pipeline Visuals

### Connector Arrows
- Directional arrows between steps: `↓` for sequential, routed on a subtle vertical rail
- Animated dot moves along the arrow during execution
- Arrow color matches the source step's primitive color

### Step Numbering + Status
- Numbered circles on the left rail: `① ② ③ ...`
- Running step: pulsing ring animation
- Completed step: filled green circle with checkmark
- Failed step: filled red circle with X
- Idle/pending: outlined circle, muted

### Pipeline Preview (Template Cards)
Instead of generic cards, templates show a **mini pipeline strip**:
```
Blog Post Pipeline        [▶ Use Template]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▷  ⊞   ◇   ▷   ▷
Web  LLM  Res  Writ Edit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4 steps • simple • text generation
```

Each primitive mini-icon uses its shape + color. The arrangement reads at a glance.

---

## Context-Aware Config Panels

Instead of generic text inputs, each config panel is alive with app context.

### Tool Call Config
```
┌─ Tool ──────────────────────────────────┐
│ [web_search ▼]          [Clear]         │ ← Auto-complete dropdown from registered tools
│─────────────────────────────────────────│
│ Description: Search the web for info    │ ← Auto-populated from tool definition
│─────────────────────────────────────────│
│ Parameters:                             │
│ ┌─────────────────────────────────────┐ │
│ │ query: "latest AI research"         │ │ ← Key-value editor, fields from schema
│ │ max_results: 10                     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Sub-agent Config
```
┌─ Agent ─────────────────────────────────┐
│ Personality:                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ ▷ General│ │ ◇ Explore│ │ ✦ Writer │ │ ← Card-style picker, not dropdown
│ └──────────┘ └──────────┘ └──────────┘ │
│ ┌──────────┐ ┌──────────┐              │
│ │ 🔬 Resrch│ │ 🎬 Video │              │
│ └──────────┘ └──────────┘              │
│─────────────────────────────────────────│
│ Task:                                    │
│ ┌─────────────────────────────────────┐ │
│ │ Research the topic and summarize    │ │
│ └─────────────────────────────────────┘ │
│ Model: [gemini-2.5-flash ▼]            │ ← Real model picker from providers
│ Max steps: [10]                         │
└─────────────────────────────────────────┘
```

### Connector Config
```
┌─ Connector ─────────────────────────────┐
│ ┌─ gmail ───────┐ ✓ Connected          │ ← Shows real auth status from connector system
│ │ Send Email    │ [Disconnect]         │
│ └───────────────┘                      │
│─────────────────────────────────────────│
│ Action: [send_email           ▼]        │ ← Actions sourced from connector schema
│─────────────────────────────────────────│
│ To:    ┌────────────────────────────┐  │
│        │ user@example.com          │  │
│        └────────────────────────────┘  │
│ Subject: ┌─────────────────────────┐  │
│          │ Hello from workflow     │  │
│          └─────────────────────────┘  │
└─────────────────────────────────────────┘
```

### LLM Config
```
┌─ Model ─────────────────────────────────┐
│ Provider: [Google AI Studio ▼]          │ ← From core/providers/
│ Model:    [gemini-2.5-flash     ▼]      │ ← From core/config/models.ts
│─────────────────────────────────────────│
│ Temperature: ────●────────── 0.7        │ ← Slider with value display
│ Max tokens:   [4096        ]            │
│─────────────────────────────────────────│
│ System Prompt:                           │
│ ┌─────────────────────────────────────┐ │
│ │ You are a helpful writing          │ │
│ │ assistant...                       │ │
│ └─────────────────────────────────────┘ │
│ [Use defaults]                          │ ← Quick-reset
└─────────────────────────────────────────┘
```

### Skill Config
```
┌─ Skill ─────────────────────────────────┐
│ Installable Capabilities:               │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ Web Search    ★★★★☆ 1.2k users  │ │ ← From skill registry
│ │ ☐ Code Analysis ★★★☆☆ 890 users   │ │
│ │ ☐ Image Gen.    ★★★★☆ 2.1k users  │ │
│ │ ☐ Data Analysis ★★★☆☆ 650 users   │ │
│ └─────────────────────────────────────┘ │
│ Selected skills affect step behavior    │
└─────────────────────────────────────────┘
```

### MCP Config
```
┌─ MCP ───────────────────────────────────┐
│ ⏳ Coming Soon                           │
│─────────────────────────────────────────│
│ MCP (Model Context Protocol) will allow │
│ connecting external tool servers to     │
│ your workflows.                          │
│─────────────────────────────────────────│
│ [Notify me when available]              │
└─────────────────────────────────────────┘
```

---

## Execution Experience

### Run Modes
| Mode | Behavior |
|------|----------|
| **Run All** | Execute every step in sequence, full auto |
| **Run From Step** | Right-click a step → "Run from here". Executes from that step forward. Steps before are skipped. |
| **Step-by-Step** | Executes one step, pauses, shows output panel with "Continue / Skip / Abort" controls |

### Visual Feedback
- **Running step**: Subtle glow around the node, animated pulse on the status dot, elapsed time counter updates live
- **Arrow animation**: A glowing dot travels down the connector arrow when moving to the next step
- **Success**: Brief green flash, status dot fills green, output summary appears below the step label
- **Error**: Step turns red, error message inline, pipeline pauses. User can retry the step or abort.
- **Output panel**: Each step has a collapsible output section showing return values, truncating long responses with "Show more"

### Status Bar
```
┌─────────────────────────────────────────────────────────────┐
│ Step 3/5 ● running  ● web_search  2.3s elapsed  [ ■ Stop ] │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure (New/Modified)

```
src/
├── pages/
│   └── WorkflowPage.tsx              ← MODIFIED: three-zone layout
├── components/
│   └── workflow/
│       ├── PrimitivePalette.tsx       ← NEW: draggable palette
│       ├── PipelineCanvas.tsx         ← NEW: canvas with connected nodes
│       ├── PipelineNode.tsx           ← NEW: node with shape+color per type
│       ├── ConnectorArrow.tsx         ← NEW: animated directional arrow
│       ├── StepInspector.tsx          ← NEW: right-side slide-over panel
│       ├── WorkflowList.tsx           ← KEPT: but template cards get mini-pipelines
│       ├── WorkflowCard.tsx           ← MODIFIED: mini pipeline preview
│       ├── WorkflowEditor.tsx         ← MODIFIED: orchestrates new components
│       ├── WorkflowStepCard.tsx       ← REMOVED: replaced by PipelineNode
│       ├── StepConfigPanel.tsx        ← MODIFIED: now renders in Inspector
│       ├── AddStepDropdown.tsx        ← REMOVED: replaced by Palette
│       └── primitive-configs/         ← MODIFIED: each gets live data integration
│           ├── ToolCallConfig.tsx
│           ├── SubAgentConfig.tsx
│           ├── ConnectorConfig.tsx
│           ├── LLMConfig.tsx
│           ├── SkillConfig.tsx
│           └── MCPConfig.tsx
├── stores/
│   └── workflowStore.ts              ← MODIFIED: add inspectedStepId, runMode
├── hooks/
│   └── useWorkflowRunner.ts          ← MODIFIED: step-by-step mode, run-from
```

---

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 1 | PipelineCanvas + PipelineNode + ConnectorArrow (horizontal auto-layout, primitive shapes, arrows) | Medium |
| 2 | Replace AddStepDropdown with PrimitivePalette (drag-to-insert, collapsible sidebar) | Small |
| 3 | Replace inline config with StepInspector (slide-over panel, click-to-open, click-away-to-close) | Medium |
| 4 | Live data integration (real tool list, connector auth status, model picker, skill registry) | Medium |
| 5 | Execution visual upgrade (animated arrows, running glow, timing, step-by-step mode, run-from) | Large |
| 6 | Template card mini-pipelines, categories, complexity tags | Small |

**Total refactor**: significant but incremental. Each phase is independently shippable.

---

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| PipelineCanvas auto-layout is hard to get right | Start with simple vertical flow (like current but with arrows). Add horizontal branching only when needed. |
| Drag-to-insert from palette adds complexity | Phase 2 can be a click-to-add as interim (current behavior), with drag as the v2 interaction. |
| Live data integration requires backend | Config panels degrade gracefully: real data when available, text input as fallback. |
| StepInspector slide-over feels heavy | Use CSS `transition-transform` for smooth open/close. Lightweight component, not a modal. |
| Animation could feel slow | Keep animations under 300ms. Use `prefers-reduced-motion` media query to disable. |

---

## What This Unlocks

Beyond cosmetics, this redesign transforms the workflow page from a form into a **design surface for content creation**. Users can:
- See their pipeline shape at a glance
- Configure steps with real app context (not placeholder inputs)
- Feel the execution happen
- Build mental models of how primitives compose

It also directly connects to the existing architecture: the palette draws from `core/tools/` and `packages/tool-runtime/`, the connector panel reads from `server/src/connectors/`, and the LLM picker uses the existing provider registry. Nothing is faked.
