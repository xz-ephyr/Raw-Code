# Core & Agent Wiring Guide

## Architecture Overview

```
React Frontend (src/pages/ChatPage.tsx)
    │
    │  DefaultChatTransport → custom fetch → chatCompletion()
    ▼
Core TypeScript Layer (core/)          ← Control plane: prompts, modes, tools, model routing
    │
    │  streamText() from Vercel AI SDK
    │  Tools execute via:
    │      ├── goProxy (port 3002) → Go Agent (file ops, git, shell, sub-agents)
    │      ├── DatabaseService (port 3001) → Express backend (sessions, DB, web search)
    │      └── Browser native fetch (HTTP, system info, resolve path)
    ▼
AI Model (Google, Groq, Mistral, OpenRouter, Cerebras, OpenCodeZen)
```

## Modes

Four modes are defined in `core/mode/` — each wraps the same underlying agent but injects a different system prompt to steer behavior:

| Mode       | ID         | Icon                       | Color      | Prompt file                                  |
|------------|------------|----------------------------|------------|----------------------------------------------|
| Plan       | `plan`     | CursorMagicSelection04Icon | blue-500   | `core/mode/plan/system-prompt.ts`            |
| Debug      | `debug`    | Bug02Icon                  | red-500    | `core/mode/debug/system-prompt.ts`           |
| Grill Me   | `grill-me` | HandsClappingIcon          | orange-500 | `core/mode/grill-me/system-prompt.ts`        |
| Teamwork   | `teamwork` | TeamWorkIcon               | green-500  | `core/mode/teamwork/system-prompt.ts`        |

### How modes feed into the AI

1. **Frontend** — `ChatInput.tsx` renders an `NTabDropdown` that maps `MODES[]` from `core/mode/` into a tab switcher. Selecting a tab calls `onModeChange(modeId)`.

2. **ChatPage** stores `currentMode` state (default `'plan'`), passes it to `ChatInput`, and sends it as `modeId` inside the custom fetch transport.

3. **Transport** — The `DefaultChatTransport`'s custom `fetch` function passes `modeId: currentModeRef.current` to `chatCompletion()`.

4. **chatCompletion()** → `getModeSystemPrompt(modeId)` → `getModeById(id)?.systemPrompt` — prepends the mode's system prompt to the base `SYSTEM_PROMPT`, then passes through `getSmartSystemPrompt()` to inject project context.

5. **Result**: The AI receives the combined prompt, so it behaves as Plan/Debug/Grill Me/Teamwork while having access to the same 21 tools.

### Wiring a new mode

```ts
// 1. Create core/mode/<name>/ directory with:
//    - index.ts          — Mode object
//    - system-prompt.ts  — Mode system prompt text
//    - skills/
//        └── index.ts    — (optional) ModeSkill[] for future use

// 2. Register in core/mode/index.ts:
import { myMode } from './my-mode';
export const MODES: Mode[] = [planMode, debugMode, grillMeMode, teamworkMode, myMode];

// 3. Add icon mapping in src/components/chat/ChatInput.tsx:
//    (if using a new icon name not already in ICON_MAP or MODE_COLORS)
```

## Tool System

### ToolDef interface (`core/types.ts`)

```ts
interface ToolDef {
  name: string;          // Unique tool name (used by AI to call)
  description: string;   // Shown to AI to describe when to use
  category: ToolCategory; // 'web' | 'code' | 'git' | 'system' | 'network'
  inputSchema: ZodType;  // Zod schema for parameter validation
  execute: (input) => Promise<output>;  // Implementation
}
```

### Tool execution routing

| Destination     | Port | Tools routed there                              |
|-----------------|------|--------------------------------------------------|
| Go Agent (goProxy) | 3002 | read_file, write_file, edit_file, list_directory, find_files, grep_files, glob_files, code_search, file_stats, count_lines, git_status, git_diff, git_log, git_branches, git_show, run_command, list_processes |
| Express backend | 3001 | web_search, fetch_page, image_search, news_search, DB persistence |
| Browser native  | —    | http_request, check_url, system_info, resolve_path, writeArtifact |

### Tool registry (`core/tools/registry.ts`)

A `Map<string, ToolDef>` with `register()`, `get()`, `list()`, `listByCategory()`, `registerAll()`. Currently not wired into `chatCompletion()` directly — tools are injected as a flat array via `allTools`.

### How tools are injected into AI calls

In `chatCompletion()` (`core/models/aiService.ts`):

```ts
return streamText({
  model: currentModel,
  system: fullSystemPrompt,
  messages: filteredMessages,
  tools: {
    writeArtifact: writeArtifactTool,
    ...allTools.reduce((acc, t) => {
      acc[t.name] = t;
      return acc;
    }, {}),
  },
});
```

Each tool's `execute()` is the AI-accessible implementation. The AI calls the tool by name, the Vercel AI SDK invokes `execute()`, and the result is fed back to the AI.

## Chat Completion Flow (End-to-End)

```
User types message
  → ChatInput.handleSend()
    → ChatSessionManager.create() (if new session)
    → DatabaseService.saveMessages()
    → useChat.sendMessage({ text })
      → DefaultChatTransport
        → custom fetch()
          → chatCompletion({
              messages,
              modelName: currentModel,
              isThinkingEnabled,
              abortSignal,
              sessionId: uuid,
              projectContext,
              modeId: currentModeRef.current
            })
            → getProviders() — memoized by API keys
            → buildFallbackChain() — primary model + up to 5 fallbacks sorted by thinking-match & Google priority
            → getModeSystemPrompt(modeId) — prepend mode prompt
            → getSmartSystemPrompt() — inject project context
            → streamText() with all tools, max 20 steps
              → AI responds with text + tool calls
              → tool calls execute against goProxy / Express / browser
              → results loop back to AI (up to 20 steps)
    → onFinish() → save assistant message to DB
```

## Go Agent Integration

### GoAgent proxy (`core/utils/goProxy.ts`)

```ts
callGoTool(toolName, params, { idempotent, timeout })
```

HTTP POST to `http://localhost:3002/api/tools/execute` with `{ tool, params }` and `x-api-key` header. Retries up to 2 times with exponential backoff. Used by all code/git/system tools.

### Go Agent internals (`agent/`)

- **Orchestrator** — routes tool calls to the right executor
- **SubAgentManager** — spawns isolated sub-agents with their own tool scope and LLM loop
- **Tool executors** — `agent/internal/tool/*.go` — one file per tool (25 total)
- **Worker pool** — parallel execution of independent tool calls

### Sub-agent orchestration

The Go agent's `SubAgentManager.Spawn()` creates a goroutine that:
1. Receives a `SubAgentRequest` with task, context, model, tool scope, max steps
2. Runs an LLM tool-calling loop (up to MaxSteps iterations)
3. Returns the final result (`SubAgentResult`)

This is not yet wired to the TypeScript core — the Go agent runs independently and is called only as a tool executor.

## Wiring Summary

### What's already wired

- ✅ ChatPage → chatCompletion() via DefaultChatTransport
- ✅ Mode selection → mode prompt injection
- ✅ All 21 tools injected into streamText()
- ✅ Tool execution routed to goProxy / Express / browser
- ✅ Model fallback chain with thinking-aware sorting
- ✅ Project context injection into system prompt
- ✅ Context contraction when model changes mid-chain

### What's not yet wired (future work)

- ⬜ **Mode-scoped tool filtering** — currently all modes get all 21 tools. Modes could restrict tools (e.g., Plan mode doesn't need `run_command`).
- ⬜ **Go agent sub-agent** — `core/agent/` is empty. The Go agent's SubAgentManager could be exposed via goProxy for complex multi-step sub-tasks.
- ⬜ **Tool registry usage** — `ToolRegistry` exists but isn't used; tools are injected as a flat `allTools` array. Registry would enable runtime tool filtering per mode.
- ⬜ **Mode skills** — `skills: ModeSkill[]` in each Mode is always empty. Skills could expose mode-specific capabilities (e.g., Debug mode has a `run_test` skill).

### How to wire a new tool

```ts
// 1. Create tool file in core/tools/<category>/<toolName>.ts
import { z } from 'zod';
import type { ToolDef } from '@core/types';

export const myTool: ToolDef = {
  name: 'my_tool',
  description: 'What this tool does',
  category: 'code',
  inputSchema: z.object({ path: z.string() }),
  execute: async ({ path }) => {
    // Call goProxy, Express, or browser API
    return callGoTool('my_tool', { path });
  },
};

// 2. Register in core/tools/allTools.ts
import { myTool } from './code/myTool';
export const allTools = [ ..., myTool ];

// 3. If routed through Go agent, add executor in agent/internal/tool/my_tool.go
```

### How to wire Go agent sub-agents to TypeScript

```ts
// Future: expose sub-agent via goProxy
const result = await callGoTool('subagent_run', {
  task: 'Refactor this function',
  tools: ['read_file', 'edit_file', 'run_command'],
  maxSteps: 10,
});
```

The Go agent already has the full sub-agent infrastructure (`SubAgentManager.Spawn()`, `subAgentRunner.run()`). The missing piece is:
1. An executor in `agent/internal/tool/subagent_run.go` that calls `SubAgentManager.Spawn()`
2. The TypeScript side calling `callGoTool('subagent_run', ...)` when the AI decides to delegate

## Environment

| Variable              | Default                  | Purpose                          |
|-----------------------|--------------------------|----------------------------------|
| `VITE_AGENT_URL`      | `http://localhost:3002`  | Go Agent HTTP endpoint           |
| `VITE_AGENT_API_KEY`  | `''`                     | Auth key for Go Agent requests   |
| `VITE_API_URL`        | `http://localhost:3001`  | Express backend endpoint         |
