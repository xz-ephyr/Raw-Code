# Default Mode — Frontend Design Spec

## Overview

Default mode is the standard agent personality: a general-purpose assistant that handles tasks directly using all available tools. It only delegates to sub-agents for genuinely complex multi-step work.

## Identity

| Field | Value |
|---|---|
| **id** | `'default'` |
| **modeId** | `'default'` |
| **label** | `'Default mode'` |
| **icon** | `'WavingHand02Icon'` (Hugeicons React) |
| **color** | none (no special theme color) |
| **description** | `'General-purpose assistant with direct tool access'` |

### Registration

Defined at `core/persona/default.ts` → exported via `core/persona/index.ts` in the `PERSONAS` array (position 0). The frontend imports `PERSONAS` at `src/components/chat/NTabDropdown.tsx:8`.

---

## System Prompt (Full Text)

```
## Default Mode — Direct Tool Use

You are a general-purpose assistant with full access to all tools.

### Rules
1. Handle simple tasks directly — search the web, write articles, 
   research topics, generate code, answer questions. Use whatever 
   tools you need.
2. For complex multi-step tasks that require gathering lots of 
   information from many sources and synthesizing into multiple 
   deliverables, use `subagent_run` to delegate.
3. You have access to all tools — `web_search`, `research`, 
   `write_article`, `edit_text`, `generate_script`, `question`, 
   `scrape_url`, etc. Use them freely.
4. Respond directly when you know the answer without needing tools.
```

### How It's Assembled at Runtime

In `core/models/nativeSystemPrompt.ts:34-35`:

```
SYSTEM_PROMPT + "\n" + defaultPersona.systemPrompt
```

Where `SYSTEM_PROMPT` is the base system prompt from `core/prompt/systemPrompt.ts` (contains artifact instructions, web search guidelines, etc.) plus:
- Tool policy (`core/prompt/toolPolicy.ts`)
- Response style instructions (concise/balanced/detailed from localStorage or default `'balanced'`)
- User custom instructions from `localStorage.getItem('ai_rules')`

---

## Available Tools

The LLM sees ALL registered tools from `@doktor/tool-runtime` (registered via `registerContentTools('content')` at `core/tools/initToolRuntime.ts`). The full list:

| Tool Name | Description |
|---|---|
| `web_search` | Lightweight single-query web search. Returns source snippets. |
| `research` | Deep multi-source research with synthesized summary. Supports `quick`/`deep` depth. |
| `research_compile` | Compile multiple research results into a structured report. |
| `write_article` | Write a full article on any topic with specified word count and format. |
| `edit_text` | Edit/rewrite existing text with instructions. |
| `generate_script` | Generate a video script from a topic or outline. |
| `question` | Ask a clarifying question to the user (human-in-the-loop). |
| `scrape_url` | Scrape a single URL for content. |
| `crawl_website` | Crawl a website starting from a URL. |
| `crawl_to_articles` | Crawl URLs and convert to articles. |
| `map_site` | Map a website's structure. |
| `extract_videos` | Extract video information from URLs. |
| `extract_images` | Extract images from content. |
| `extract_structured` | Extract structured data from content. |
| `import_video_sources` | Import video source metadata. |
| `write_artifact` | Create a formatted artifact (markdown/doc/pptx/excel/pdf). |
| `render_video` | Render a video project. |
| `preview_video` | Preview a video before export. |
| `export_video` | Export a rendered video. |
| `edit_video` | Edit video content. |
| `poll_render_job` | Poll a video render job for completion. |
| `create_plan` | Create a multi-step plan. |
| `execute_plan` | Execute a previously created plan. |
| `plan_templates` | List available plan templates. |
| `subagent_run` | Delegate to a sub-agent (for complex multi-step only). |
| `compose_run` | Define and run a multi-step agent pipeline. |
| Connectors | YouTube, Gmail, Reddit, Twitter, Telegram, Google Drive, GitHub (when connected). |

### When `subagent_run` Is Called

The sub-agent (general personality at `packages/subagent/src/personalities.ts:9`) has its own tool scope:

```
question, research, web_search, write_article, edit_text, 
generate_script, scrape_url, extract_structured, extract_images,
research_compile, crawl_website, crawl_to_articles, map_site,
plan_templates, create_plan, execute_plan
```

---

## Behavioral Decision Flow

```
User sends message
    │
    ▼
[LLM evaluates with system prompt]
    │
    ├── Can answer without tools? ──────► Direct text response
    │
    ├── Task needs a single tool call? ──► Call tool directly
    │   (search, research, write_article, etc.)
    │   └── Tool result returned → LLM synthesizes final response
    │
    └── Task is complex multi-step? ─────► Call subagent_run
        (needs multiple sources + multiple 
         deliverables like research+write+video)
        └── Sub-agent handles it → returns result
```

### Heuristics the LLM Follows

| Scenario | Behavior |
|---|---|
| "What is the capital of France?" | Direct answer. No tools. |
| "Write a JS palindrome function" | Direct code output. No tools. |
| "Search the web for AI news" | Calls `web_search` directly. |
| "Research quantum computing and write a summary" | Calls `research` directly, then synthesizes. |
| "Write a 500-word article about renewable energy" | Calls `write_article` directly. |
| "Research latest AI, write an article, and create a video script about it" | May call `subagent_run` for complex multi-deliverable task. |
| "Make it better" (ambiguous) | Asks clarifying question via `question` tool or directly. |
| "Explain dependency injection" | Direct explanation from knowledge. |

---

## Test Suite (10 Real LLM Tasks)

Defined at `tests/selftest/agent-tasks.ts`. Each task sends the prompt through `ChatStreamService.start({ modeId: 'default' })` and validates behavior.

| # | Task ID | Prompt | Expected Behavior |
|---|---|---|---|
| 1 | `simple-qa` | "What is the capital of France?" | Direct answer. Contains "Paris". No subagent. |
| 2 | `code-gen` | "Write a JS function that checks if a string is a palindrome." | Direct code. Contains "function" and "return". ≥80 chars. |
| 3 | `web-search` | "Search the web for the latest AI developments in 2026." | Calls `web_search` or `research` directly. ≥100 chars. No subagent. |
| 4 | `research-write` | "Research the impact of AI on healthcare and write a 200-word summary." | Direct tools (research + write). ≥200 chars. No subagent. |
| 5 | `math` | "If a train travels at 120 km/h for 2.5 hours, how far does it go?" | Direct answer. Contains "300". No tool calls. |
| 6 | `ambiguous` | "Make it better" | Asks clarifying question. ≥10 chars. |
| 7 | `definition` | "Explain what dependency injection is." | Direct answer. Contains "pattern". ≥80 chars. |
| 8 | `tool-direct` | "Use the web_search tool to look up the weather in Tokyo today." | Calls `web_search` directly. ≥20 chars. No subagent. |
| 9 | `creative` | "Write a short poem about version control." | Direct creative output. ≥50 chars. No subagent mention. |
| 10 | `reasoning` | "What would happen if Earth stopped spinning? Explain in detail." | Direct explanation. ≥150 chars. No subagent. |

### CLI Runner

```
npx tsx tests/selftest/run.ts --layer mode-default-real --full
```

Requires `OPENAI_API_KEY` (or other provider) in env. Uses real API calls with the full system prompt + tool definitions and validates responses.

### Frontend Runner

Route: `/#/__test/agent` — `AgentTaskTestRunner.tsx` at `src/components/selftest/AgentTaskTestRunner.tsx`.

Runs all 10 tasks through `ChatStreamService.start()` with `modeId: 'default'`. Requires API keys configured in Settings.

---

## Data Flow: Frontend → Backend

```
NTabDropdown.onModeChange('default')
    │
    ▼
useChatPage.handleModeChange('default')
    │  sets projectStore.currentMode = 'default'
    ▼
useChatPage.handleSend()
    │  reads currentMode from store
    ▼
ChatStreamService.start({
    sessionId,
    messages: [...],
    modelName: 'auto',
    modeId: 'default',          // ← currentMode
    projectContext,
    connectedConnectors,
    isWebSearchEnabled,
    isThinkingEnabled,
})
    │
    ▼
nativeChatCompletion({
    messages,
    modelName: 'auto',
    modeId: 'default',          // ← passed through
    projectId: sessionId,
    projectContext,
    connectedConnectors,
    abortSignal,
})
    │
    ▼
buildNativeSystemPrompt({ modeId: 'default' })
    │  concatenates: SYSTEM_PROMPT + "\n" + defaultPersona.systemPrompt
    │  + toolPolicy + responseStyle + customInstructions
    ▼
LLMRequest with full system prompt + all tools
    │
    ▼
createToolLoop → streams LLMEvent[] back to frontend
```

### Event Types Streamed Back

| Event Type | When | Data |
|---|---|---|
| `connected` | Stream opened | `{}` |
| `step-start` | Tool loop step begins | `{}` |
| `text-start` | Text generation begins | `{}` |
| `text-delta` | Text token generated | `{ text: string }` |
| `text-end` | Text generation ends | `{}` |
| `tool-call` | Tool invoked | `{ id, name, input }` |
| `tool-result` | Tool returns | `{ id, result }` |
| `step-finish` | Step completes | `{}` |
| `finish` | Stream complete | `{ reason }` |
| `provider-error` | Error from LLM | `{ message }` |

---

## Frontend UI Requirements

### Mode Selector (NTabDropdown)

The existing dropdown at `src/components/chat/NTabDropdown.tsx` already handles default mode. Points to verify:

- [ ] **Default icon**: `WavingHand02Icon` from `@hugeicons/core-free-icons` — already imported.
- [ ] **Default label**: "Default mode" — from `defaultPersona.label`.
- [ ] **Description**: "General-purpose assistant with direct tool access" — from `defaultPersona.description`. Currently shown as tooltip on hover only (line 58: `title={tab.label}`). Consider showing the description in the trigger button or as a subtitle.
- [ ] **No special color**: Unlike Teamwork (amber), default mode has no color tint. The button uses `text-foreground hover:bg-muted`.

### Known Bug — Default Mode Store Value

In `src/stores/projectStore.ts:25`:

```ts
currentMode: 'writer',
```

There is **no** persona with `id: 'writer'`. This should be `'default'` or `undefined`. The `NTabDropdown` falls back to index 0 (default) via `NTABS.findIndex(...)` returning -1, then uses `NTABS[0]`, so the visual display is correct. But the stored value is `'writer'`, which means:

- Any code checking `currentMode === 'writer'` will match (currently none does).
- On page reload, if the store persists 'writer', the dropdown shows default (fallback behavior).
- **Fix**: Change line 25 to `currentMode: 'default'`.

### Possible UI Enhancements

#### Trigger Button

Current: icon + label on hover highlight.
Suggestion: Show the description as a subtitle beneath the label in the expanded dropdown (already done at line 91: `t.description` in a smaller font).

#### Active Mode Indicator

Current: just highlights the selected row with `bg-muted`.
Suggestion: For default mode, no special treatment needed. Keep it neutral.

#### Tool Availability Badge

Suggestion: In the mode selector dropdown, show a tool count badge (e.g., "28 tools available") on hover or in the description area. This helps users understand what each mode can do.

#### Test Suite Integration

The `/#/__test/agent` route runs the 10 real tasks. Consider adding a "Run Mode Tests" button in the mode selector's detail panel or settings.

---

## Reference Files

| File | Purpose |
|---|---|
| `core/persona/default.ts` | Persona definition (id, label, icon, systemPrompt) |
| `core/persona/types.ts` | `Persona` interface |
| `core/persona/index.ts` | `PERSONAS` array + `getPersonaById()` |
| `core/models/nativeSystemPrompt.ts` | Assembles mode prompt + base prompt + tool policy |
| `core/models/nativeChatCompletion.ts` | Main entrypoint: builds LLM request with tools + mode system prompt |
| `src/services/ChatStreamService.ts` | Frontend service: sends messages with modeId to nativeChatCompletion |
| `src/components/chat/NTabDropdown.tsx` | Mode selector dropdown UI |
| `src/stores/projectStore.ts` | Zustand store: `currentMode` state |
| `src/hooks/useChatPage.ts` | Hook: wires mode selection to message sending |
| `src/components/selftest/AgentTaskTestRunner.tsx` | Frontend test runner (10 real tasks) |
| `tests/selftest/agent-tasks.ts` | 10 task definitions with expected behaviors |
| `tests/selftest/layers/mode-default-real.ts` | CLI test layer (real API calls) |
| `packages/tool-runtime/src/builtins.ts` | All tool registrations |
| `packages/subagent/src/personalities.ts` | Sub-agent personalities (used when subagent_run is called) |
