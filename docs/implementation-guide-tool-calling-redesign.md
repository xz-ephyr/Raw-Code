# Tool Calling Policy & ThinkingTimeline Redesign — Implementation Guide

## Overview

This document describes how to implement two major interconnected features:

1. **A function-driven tool calling policy** that teaches the model and sub-agents optimal tool selection ratios (grep/glob 45%, read 20%, edit 15%, write 15%, listdir 5%).
2. **A redesigned ThinkingTimeline UI** with shimmer states, inline detail boxes, clickable expand/collapse, and a dedicated **Explorer Agent** for first-time project exploration.

---

## Part 1: Tool Calling Policy Function

### 1.1 Goal

Replace the current implicit tool guidance (scattered across `systemPrompt.ts` and `toolcallGuide.ts`) with an explicit **`ToolPolicyFunction`** that:

- Guides the model toward optimal tool ratios per context (new task vs. continuing session)
- Can be reused by the main chat model AND all sub-agents
- Dynamically adjusts based on session state (new task / continuing session)
- Outputs a formatted policy block injected into the system prompt

### 1.2 Where to create

**New file:** `core/prompt/toolPolicy.ts`

```typescript
/**
 * ToolPolicy — guides model and sub-agents toward optimal tool selection ratios.
 *
 * Usage: call `buildToolPolicy(sessionContext)` and append the result to the
 * system prompt (in systemPrompt.ts) and also pass into subagent_run via toolScope + policy.
 */

export type SessionContext = 'new_task' | 'continuing_session';

export interface ToolPolicy {
  ratios: Record<string, number>;   // tool name -> recommended usage %
  phases: ToolPhase[];
  rules: string[];
}

export interface ToolPhase {
  name: string;
  tools: string[];
  description: string;
}

export function buildToolPolicy(context: SessionContext): string {
  const policy = context === 'new_task'
    ? NEW_TASK_POLICY
    : CONTINUING_SESSION_POLICY;

  return formatPolicy(policy);
}

const NEW_TASK_POLICY: ToolPolicy = {
  ratios: {
    grep:        45,   // search_codebase (pattern + query)
    glob:        45,   // search_codebase (pattern for filenames)
    read_file:   20,
    edit_file:   15,
    write_file:  15,
    list_directory:  5,
    run_command:  0,   // only when explicitly needed
    web_search:   0,   // only when user asks
  },
  phases: [
    {
      name: 'Explore',
      tools: ['search_codebase', 'list_directory'],
      description: 'Use grep/glob to locate relevant files. List directories only when the project structure is unknown and grep/glob results are insufficient.',
    },
    {
      name: 'Read',
      tools: ['read_file'],
      description: 'Read files identified by Explore phase. Read only what grep/glob pointed to — not entire directories.',
    },
    {
      name: 'Act',
      tools: ['edit_file', 'write_file'],
      description: 'Make changes based on what you read. Never write/edit without reading first.',
    },
    {
      name: 'Verify',
      tools: ['run_command'],
      description: 'Run tests, lint, or build to verify changes compile and pass.',
    },
  ],
  rules: [
    'In a new task, spend ~70% of tool calls in Explore+Read phases before touching any file.',
    'Prefer search_codebase (with query or pattern) over list_directory. list_directory is a fallback only.',
    'read_file only after grep/glob narrows down the exact file and location.',
    'Never edit_file or write_file in the first 50% of tool calls on a new task.',
    'If 3 consecutive grep/glob calls return no results, switch approach — try a broader pattern then list_directory.',
  ],
};

const CONTINUING_SESSION_POLICY: ToolPolicy = {
  ratios: {
    grep:        30,
    glob:        30,
    read_file:   20,
    edit_file:   20,
    write_file:  20,
    list_directory:  0,   // rarely needed in continuing session
    run_command: 10,
    web_search:   0,
  },
  phases: [
    {
      name: 'Orient',
      tools: ['search_codebase', 'read_file'],
      description: 'Quickly re-read files you worked on earlier — they may have changed.',
    },
    {
      name: 'Act',
      tools: ['edit_file', 'write_file'],
      description: 'Make targeted changes. You already know the codebase.',
    },
    {
      name: 'Verify',
      tools: ['run_command'],
      description: 'Run verification after changes.',
    },
  ],
  rules: [
    'You already explored this codebase. Jump to reading and editing faster.',
    'Always read_file before edit_file — even if you wrote the file earlier this session.',
    'Use search_codebase to find recent changes or confirm file locations, not to re-explore.',
    'list_directory is almost never needed in a continuing session.',
  ],
};

function formatPolicy(policy: ToolPolicy): string {
  const ratioLines = Object.entries(policy.ratios)
    .filter(([_, v]) => v > 0)
    .map(([tool, pct]) => `  - ${tool}: ~${pct}%`);

  const phaseLines = policy.phases.map(p =>
    `  ${p.name}: ${p.description}\n    Tools: ${p.tools.join(', ')}`
  );

  return [
    '### TOOL USAGE POLICY',
    '',
    '**Recommended tool ratios:**',
    ...ratioLines,
    '',
    '**Phases (in order):**',
    ...phaseLines,
    '',
    '**Rules:**',
    ...policy.rules.map(r => `  - ${r}`),
  ].join('\n');
}
```

### 1.3 How to wire it in

**In `core/prompt/systemPrompt.ts`:**

```typescript
import { buildToolPolicy } from './toolPolicy';

// Determine context — in aiService.ts, pass isNewSession boolean
export const SYSTEM_PROMPT = (isNewSession: boolean) => `${SYSTEM_BEHAVIOR}

${buildToolPolicy(isNewSession ? 'new_task' : 'continuing_session')}

...
${TOOLCALL_GUIDE}`;
```

**In `core/models/aiService.ts`:**

The `chatCompletion` function should detect whether this is a new task or continuing session:

```typescript
const isNewSession = previousModelName === undefined || messages.length <= 2;
const fullSystemPrompt = SYSTEM_PROMPT + (isNewSession
  ? buildToolPolicy('new_task')
  : buildToolPolicy('continuing_session'));
```

**For sub-agents** (`agent/internal/agent/agent_types.go`):

Add a `ToolPolicy` field to `AgentConfig` and `SubAgentRequest`:

```go
type AgentConfig struct {
    ToolScope []string
    ToolPolicy string   // injected into system prompt
}
```

The `BuildAgentSystemPrompt()` function should append the policy:

```go
func BuildAgentSystemPrompt(agentType string) string {
    cfg := GetAgentConfig(agentType)
    prompt := basePrompt
    if cfg.ToolPolicy != "" {
        prompt += "\n\n" + cfg.ToolPolicy
    }
    return prompt
}
```

### 1.4 Where the ratios live and how they're enforced

The ratios are **guidance, not enforcement** — they live in the system prompt as instructions. The LLM decides which tools to call; the policy nudges it toward the optimal distribution.

For enforcement at the **sub-agent loop level** (`agent/internal/agent/loop.go`), you could add optional step-count-based tool gating:

```go
type ToolPolicy struct {
    Ratios       map[string]float64
    MinExploitSteps int  // min steps before edit/write allowed
}
```

In `RunAgentLoop`, track the call distribution and inject a system warning if the model diverges:

```go
if isEditOrWrite(tc.Function.Name) && step < cfg.ToolPolicy.MinExploitSteps {
    messages = append(messages, model.Message{
        Role: "system",
        Content: fmt.Sprintf("[Policy] You are on step %d/%d. The exploration policy recommends %d more steps of read-only investigation before making changes.",
            step+1, cfg.MaxSteps, cfg.ToolPolicy.MinExploitSteps - step - 1),
    })
    continue
}
```

---

## Part 2: ThinkingTimeline UI Redesign

### 2.1 Goal

Replace the current expandable/dropdown tool call display with a cleaner, more informative timeline that:

- Shows **icon + presentPrefix/pastPrefix + inline action summary** (e.g. `"Running npm run dev"`, `"Read src/main.tsx"`, `"Grepped useEffect in src/**/*.tsx"`)
- **Shimmers only when running** — stops shimmer on result or error
- Is **not clickable** to show a dropdown anymore (the shimmer IS the state)
- Shows **inline detail text** beneath the tool line:
  - For `run_command`: `script` prefix + the raw command string
  - For `read_file`: `offset=N, limit=M` after the file path
  - For `write_file`: `+23 / -0` (lines added/removed)
  - For `edit_file`: `+12 / -4` (lines added/removed)
- The inline box is **clickable** to expand/collapse a detail panel:
  - For `run_command`: split box — **Input** (command, dark gray bg, monospace, single line) + **Output** (stdout/stderr, same bg as current)
  - For `read/write/edit`: shows the **file content diff** or offset header
- Borders reduced to half current pixel width and more faint

### 2.2 Data flow changes

The `TimelineStep` interface in `ThinkingTimeline.tsx` needs additional fields:

```typescript
export interface TimelineStep {
  id: string;
  type: 'thinking' | 'searching';
  reasoning?: string;
  query?: string;
  isRunning?: boolean;
  sources?: TimelineSource[];
  isActive: boolean;
  error?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;

  // New fields for redesigned UI
  inlineSummary?: string;       // e.g. "src/main.tsx", "npm run dev"
  scriptLine?: string;          // raw command for run_command
  filePath?: string;            // file being targeted
  linesAdded?: number;          // for edit/write
  linesRemoved?: number;        // for edit/write
  readOffset?: number;          // for read_file
  readLimit?: number;           // for read_file
  toolCount?: number;           // for explorer agent summary
  wallClockMs?: number;         // for explorer agent summary
}
```

These fields get populated in `buildStepsFromParts()` in `chatUtils.ts` by parsing `toolInput` and `toolOutput`.

### 2.3 Step builder — extracting inline detail

In `src/lib/chatUtils.ts` (or inline in `ThinkingTimeline.tsx`), add a helper:

```typescript
function extractToolInlineInfo(toolName: string, input: any, output: any): {
  inlineSummary: string;
  scriptLine?: string;
  filePath?: string;
  linesAdded?: number;
  linesRemoved?: number;
  readOffset?: number;
  readLimit?: number;
} {
  switch (toolName) {
    case 'run_command': {
      const cmd = input?.command || '';
      return {
        inlineSummary: cmd.slice(0, 80),
        scriptLine: cmd,
      };
    }
    case 'read_file': {
      const path = input?.path || '';
      const offset = input?.offset;
      const limit = input?.limit;
      const summary = offset != null
        ? `${path} (offset=${offset}, limit=${limit ?? 'full'})`
        : path;
      return {
        inlineSummary: summary,
        filePath: path,
        readOffset: offset,
        readLimit: limit,
      };
    }
    case 'write_file': {
      const path = input?.path || '';
      const oldContent = output?.oldContent || '';
      const newContent = output?.content || input?.content || '';
      const added = countLines(newContent) - countLines(oldContent);
      return {
        inlineSummary: `${path}  +${Math.max(0, added)} / -${Math.max(0, -added)}`,
        filePath: path,
        linesAdded: Math.max(0, added),
        linesRemoved: Math.max(0, -added),
      };
    }
    case 'edit_file': {
      const path = input?.path || '';
      const oldStr = input?.oldString || '';
      const newStr = input?.newString || '';
      const added = countLines(newStr) - countLines(oldStr);
      return {
        inlineSummary: `${path}  +${Math.max(0, added)} / -${Math.max(0, -added)}`,
        filePath: path,
        linesAdded: Math.max(0, added),
        linesRemoved: Math.max(0, -added),
      };
    }
    case 'search_codebase': {
      const query = input?.query || input?.pattern || '';
      return {
        inlineSummary: query,
      };
    }
    case 'list_directory': {
      return {
        inlineSummary: input?.path || '',
      };
    }
    default:
      return { inlineSummary: '' };
  }
}

function countLines(s: string): number {
  if (!s) return 0;
  return s.split('\n').length;
}
```

### 2.4 Rewritten ThinkingTimeline renderer

The component should be restructured. Here is the new design:

```typescript
// ThinkingTimeline.tsx — redesigned structure

function ThinkingTimeline({ steps, isStreaming }: ThinkingTimelineProps) {
  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, idx) => (
        <TimelineRow
          key={step.id}
          step={step}
          isLast={idx === steps.length - 1}
          isStreaming={isStreaming}
        />
      ))}
    </div>
  );
}

function TimelineRow({ step, isLast, isStreaming }) {
  const config = TOOL_CONFIG[step.toolName ?? ''];
  const prefix = step.isRunning ? config?.presentPrefix : config?.pastPrefix;
  const showShimmer = step.isRunning && isStreaming;
  const isExplorerAgent = step.toolName === 'subagent_run' && step.type === 'exploring';

  return (
    <div className="flex flex-col">
      {/* Main line: icon + prefix + inline summary */}
      <div className={`flex items-center gap-2 text-xs ${showShimmer ? 'thinking-shimmer-text' : ''}`}>
        <div className="w-4 h-4 flex items-center justify-center">
          {step.isRunning
            ? <RunningSpinner />
            : <HugeiconsIcon icon={config?.icon || InternetIcon} size={14} />}
        </div>
        <span className="text-muted-foreground font-medium">{prefix}</span>
        <span className="text-foreground">{step.inlineSummary}</span>
      </div>

      {/* Inline detail box (clickable to expand) */}
      {!isExplorerAgent && (
        <ToolInlineBox step={step} />
      )}

      {/* Explorer agent special rendering */}
      {isExplorerAgent && (
        <ExplorerAgentBlock step={step} isStreaming={isStreaming} />
      )}
    </div>
  );
}
```

### 2.5 ToolInlineBox component

This replaces the old expandable dropdown. It shows a subtle detail line that can be clicked to reveal a fuller detail panel.

```typescript
function ToolInlineBox({ step }: { step: TimelineStep }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = TOOL_CONFIG[step.toolName ?? ''];

  if (!config) return null;

  const hasInput = step.toolInput && Object.keys(step.toolInput).length > 0;
  const hasOutput = step.toolOutput != null && step.toolOutput !== '';

  if (!hasInput && !hasOutput) return null;

  return (
    <div className="ml-6 mt-1">
      {/* Inline summary line (clickable) */}
      {step.toolName === 'run_command' && step.scriptLine && (
        <div
          className="text-[11px] font-mono text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors truncate"
          onClick={() => setIsOpen(!isOpen)}
        >
          script  {step.scriptLine}
        </div>
      )}
      {(step.toolName === 'read_file' || step.toolName === 'write_file' || step.toolName === 'edit_file') && step.filePath && (
        <div
          className="text-[11px] font-mono text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors truncate"
          onClick={() => setIsOpen(!isOpen)}
        >
          {step.filePath}
          {step.readOffset != null && `  offset=${step.readOffset}`}
          {step.readLimit != null && `, limit=${step.readLimit}`}
          {step.linesAdded != null && `  +${step.linesAdded} / -${step.linesRemoved}`}
        </div>
      )}

      {/* Expanded detail panel */}
      <div className={`grid transition-all ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden min-h-0">
          <div className="mt-2 rounded-lg border border-border/30 bg-muted/50 overflow-hidden">
            {step.toolName === 'run_command' && (
              <div className="flex flex-col">
                <div className="bg-card/80 px-3 py-2 font-mono text-xs text-foreground border-b border-border/20">
                  {step.scriptLine}
                </div>
                {hasOutput && (
                  <div className="px-3 py-2 font-mono text-xs text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {typeof step.toolOutput === 'string'
                      ? step.toolOutput
                      : JSON.stringify(step.toolOutput, null, 2)}
                  </div>
                )}
              </div>
            )}
            {step.toolName === 'read_file' && hasOutput && (
              <div className="px-3 py-2 font-mono text-xs text-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                {typeof step.toolOutput === 'string'
                  ? step.toolOutput
                  : JSON.stringify(step.toolOutput, null, 2)}
              </div>
            )}
            {(step.toolName === 'write_file' || step.toolName === 'edit_file') && (
              <div className="px-3 py-2 font-mono text-xs text-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                {/* Show diff-style output if available */}
                {typeof step.toolOutput === 'string'
                  ? step.toolOutput
                  : JSON.stringify(step.toolOutput, null, 2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2.6 Shimmer behavior rules

1. Only active (running) steps shimmer — use CSS class `thinking-shimmer-text`
2. When a tool completes (result or error), shimmer immediately stops
3. If a new tool or reasoning stream arrives after a failed tool, any still-shimmering tool stops
4. Shimmer uses the existing `thinking-shimmer-text` class from `styles/index.css`

```typescript
// In MessageList or AssistantBubble, when building steps:
// After a failed tool, mark all remaining running steps as not running
function finalizeFailedSteps(steps: TimelineStep[]): TimelineStep[] {
  let sawFailure = false;
  return steps.map(s => {
    if (s.error) sawFailure = true;
    if (sawFailure && s.isRunning) return { ...s, isRunning: false, isActive: false };
    return s;
  });
}
```

### 2.7 Border redesign

The `.rounded-lg` border on the expanded detail panel uses `border-border/30` — half the current pixel width and more faint. The timeline container border is also reduced:

```css
/* In styles/index.css or tailwind config */
.timeline-detail-box {
  @apply rounded-lg border border-border/30;
}
```

---

## Part 3: Explorer Agent

### 3.1 Goal

A new agent type specifically for **first-time codebase exploration** in project mode. It is triggered when the main model detects the task requires understanding an unfamiliar codebase before making changes.

### 3.2 When to use

The system prompt tells the model:

```
When the user gives a task that requires understanding an unfamiliar project
or a significant portion of the codebase (anything beyond a single-file fix),
DO NOT start calling tools directly. Instead, delegate to the Explorer Agent
via subagent_run with task description 'explore' and set maxSteps to 15-20.

Use Explorer Agent when:
- The task says "add a login page" and you haven't seen the project structure
- The task involves multiple files and you don't know where they are
- The user says "explore this project" or "understand this codebase"

Do NOT use Explorer Agent for:
- Simple file reads or single-line fixes
- Questions you can answer with one grep/glob call
- Tasks where you already know the relevant files from this session
```

### 3.3 Implementation

#### TypeScript side

Register a new agent in `core/agents/explorer/index.ts`:

```typescript
import { Agent } from '../types';

export const explorerAgent: Agent = {
  id: 'explorer',
  label: 'Explore Task',
  icon: 'DiscoverSquareIcon',
  description: 'Explores unfamiliar codebases to understand structure and find relevant files',
  color: 'emerald-700',
  toolScope: ['search_codebase', 'read_file', 'list_directory'],  // READ ONLY — no edit/write/run
  systemPrompt: `You are an Explorer Agent. Your ONLY job is to understand the codebase.

## Tool Policy (strict)
- 70% of calls: search_codebase (grep content + glob filenames)
- 5% of calls: list_directory (only when grep/glob fails)
- 25% of calls: read_file (only after grep/glob identified specific files)

## Rules
- NEVER edit, write, or run commands. You are read-only.
- Do NOT propose changes or fixes. Just explore and report.
- Start broad, then narrow: glob -> grep -> read
- Max 20 tool calls. Be efficient.
- When done, provide a detailed summary of:
  1. Project structure (key directories and files)
  2. Relevant files for the task
  3. Existing patterns, conventions, and utilities
  4. Anything that would help someone make changes to this codebase`,
};
```

Register in `core/agents/index.ts`:

```typescript
import { explorerAgent } from './explorer';
export const AGENTS: Agent[] = [
  explorerAgent,
  strategyAuditorAgent,
  debugAgent,
  teamworkAgent,
];
```

#### Go backend side

In `agent/internal/agent/agent_types.go`:

```go
const AgentExplorer = "explorer"

var agentRegistry = map[string]AgentConfig{
    AgentExplorer: {
        ToolScope: []string{"search_codebase", "read_file", "list_directory"},
        ToolPolicy: `## Tool Policy (strict)
- 70% of calls: search_codebase (grep + glob)
- 5% of calls: list_directory (only when grep/glob fails)
- 25% of calls: read_file (only after grep/glob identified files)
- NEVER edit, write, or run commands. Read-only.`,
        MaxSteps: 20,
    },
}
```

### 3.4 Explorer Agent UI in ThinkingTimeline

When a `subagent_run` call has `task` containing `"explore"` or uses `agentType: "explorer"`, the timeline renders it as an **ExplorerAgentBlock**:

```typescript
function ExplorerAgentBlock({ step, isStreaming }: { step: TimelineStep; isStreaming: boolean }) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const output = step.toolOutput;
  const subSteps = output?.steps || output?.toolCalls || [];
  const toolCount = step.toolCount ?? subSteps.length;
  const wallClockMs = step.wallClockMs ?? output?.durationMs ?? 0;

  return (
    <div className="ml-6 mt-1 flex flex-col gap-1">
      {/* Header — only part that shimmers */}
      <div className={`flex items-center gap-2 text-xs ${step.isRunning ? 'thinking-shimmer-text' : ''}`}>
        <DiscoverSquareIcon size={14} />
        <span className="text-foreground font-medium">Explore Task</span>
        <span className="text-muted-foreground">
          {step.inlineSummary || 'Understanding project structure...'}
        </span>
      </div>

      {/* Tool calls below header — one at a time, replacing each other */}
      {step.isRunning && subSteps.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1">
          {subSteps.slice(-3).map((s: any, i: number) => (
            <div key={i} className="text-[11px] font-mono text-muted-foreground/60">
              {s.toolName}: {truncateToolParam(s)}
            </div>
          ))}
        </div>
      )}

      {/* When done: show summary */}
      {!step.isRunning && (
        <div className="text-[11px] text-muted-foreground/60 mt-1">
          {toolCount} tool calls in {formatDuration(Math.floor(wallClockMs / 1000))}
        </div>
      )}
    </div>
  );
}

function truncateToolParam(s: any): string {
  if (!s) return '';
  const input = s.toolInput || s.params || {};
  return input.path || input.query || input.pattern || input.command || '';
}
```

### 3.5 Triggering the Explorer Agent

In `systemPrompt.ts` or `toolcallGuide.ts`, add guidance:

```
### EXPLORER AGENT (project mode only)

For complex, multi-file tasks in an unfamiliar project:
  - Call subagent_run with: agentType: "explorer", task: "<what needs exploring>"
  - The explorer is READ-ONLY (no edit/write/run)
  - Set maxSteps to 15-20 for thorough exploration
  - After it returns, use its summary to make targeted changes

Example:
  subagent_run({
    agentType: "explorer",
    task: "Explore the auth system. Find: 1) login/register routes, 2) session management, 3) token refresh flow. I need to add OAuth support.",
    maxSteps: 15
  })
```

---

## Part 4: Integration Checklist

### Files to create
- [ ] `core/prompt/toolPolicy.ts` — ToolPolicy builder
- [ ] `core/agents/explorer/index.ts` — Explorer agent definition
- [ ] (Go) Register explorer in `agent/internal/agent/agent_types.go`

### Files to modify
- [ ] `core/prompt/systemPrompt.ts` — Inject tool policy, add explorer agent guidance
- [ ] `core/prompt/toolcallGuide.ts` — Add explorer agent section
- [ ] `core/models/aiService.ts` — Detect new-task vs. continuing session
- [ ] `core/agents/index.ts` — Register explorer agent
- [ ] `src/components/chat/ThinkingTimeline.tsx` — Major UI redesign
- [ ] `src/lib/chatUtils.ts` — Extract inline tool info in step builder
- [ ] `src/components/chat/AssistantBubble.tsx` — Pass new step fields
- [ ] `agent/internal/agent/agent_types.go` — Add AgentExplorer + ToolPolicy field
- [ ] `agent/internal/agent/loop.go` — Optional step-count-based tool gating
- [ ] `agent/internal/agent/subagent.go` — Pass ToolPolicy to sub-agent loop

### Potential issues
1. **Explorer agent detection** — The `subagent_run` tool needs a way to signal "this is an explorer agent" to the UI. Options:
   - Add `agentType: "explorer"` field to `subagentRunTool` input schema
   - Detect from task description containing keywords like "explore" or "investigate"
   - Add a dedicated `explorer_run` tool separate from `subagent_run`

   **Recommended**: Add `agentType` field to `subagentRunTool` input schema.

2. **Tool ratio enforcement** — LLMs may not strictly follow percentage guidance. The system prompt + optional step gating in the Go loop is the best approach. Do NOT hard-block tools — guide and warn instead.

3. **UI backward compatibility** — Existing chat history will have TimelineSteps without the new fields. The ThinkingTimeline should gracefully fall back for missing `inlineSummary`, `scriptLine`, etc.

4. **Explorer tool calls not shown individually** — By design, the explorer hides individual tool calls (shows them briefly as they happen, then replaces with count + duration). This keeps the UI clean. If users want detail, they can read the explorer's summary text.
