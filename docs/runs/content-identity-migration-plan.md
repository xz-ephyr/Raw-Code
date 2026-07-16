# Migration Plan: Coding Agent → Content-Creation Pipeline

## Overview

Replace all coding-agent identity in prompts, agents, and tools with a content-creation pipeline. The LLM will no longer be told it's a "coding assistant" or enumerated its tools — the AI SDK handles tool selection silently.

---

## Phase 1 — Create `core/persona/` (replace `core/agents/`)

New folder structure:

```
core/persona/
├── index.ts       — Persona registry, getPersonaById()
├── types.ts       — Persona interface
├── writer.ts      — "You are a professional content writer..."
├── researcher.ts  — "You are a thorough research agent..."
└── video.ts       — "You are a video content creation agent..."
```

3 personas, matching the subagent personalities in `packages/subagent/src/personalities.ts`. No Explorer, Debug, or Teamwork.

### `types.ts`
```ts
export interface Persona {
  id: string;
  label: string;
  icon: string;
  systemPrompt: string;
  color: string;
  modeId: string;
}
```

### `index.ts`
```ts
import { writerPersona } from './writer';
import { researcherPersona } from './researcher';
import { videoPersona } from './video';

export const PERSONAS: Persona[] = [writerPersona, researcherPersona, videoPersona];

export function getPersonaById(id: string): Persona | undefined {
  return PERSONAS.find(p => p.id === id);
}
```

### Per-persona file pattern (e.g. `writer.ts`)
```ts
import type { Persona } from './types';
export const writerPersona: Persona = {
  id: 'writer',
  label: 'Writer',
  icon: 'Pen02Icon',        // or whatever icon library
  color: 'green',
  modeId: 'writer',
  systemPrompt: `You are a Writer — a professional content writer. Your job is to create high-quality written content including articles, scripts, and documentation.

Guidelines:
- Focus on clarity, tone, and audience
- Use research tools to gather facts before writing
- Iterate with edit_text for revisions
- Generate video scripts with generate_script when needed
- Collaborate with Researcher and Video agents for multi-modal projects`,
};
```

---

## Phase 2 — Strip Coding from System Prompts

### `core/prompt/systemPrompt.ts`

**Remove:**
- Lines 57–63: "Code changes workflow" block
- Lines 65–83: "Search methodology" block (grep/glob/search_codebase/progressive narrowing)
- Lines 85–99: "Git workflow" + "Running commands" blocks

**Keep:**
- Lines 1–13: ARTIFACTS block (modified — see below)
- Lines 30–44: Web search section
- Lines 46–55: CONTENT TOOLS section
- Lines 101–106: When to delegate to sub-agent

**Add (replacing removed sections):**

```
### CONTENT WORKFLOW
1. Research — Use research tools to gather information on the topic
2. Write — Create content with write_article or generate_script
3. Edit — Polish with edit_text
4. Review — Verify quality, accuracy, and completeness
5. Produce — Render video with render_video or export as artifact
6. Distribute — Use connectors to publish (YouTube, Gmail, social media)
```

### `core/prompt/toolPolicy.ts`

Replace entirely. No grep/glob/edit_file/write_file ratios. New content-creation policy:

```
### TOOL USAGE POLICY

**Tool categories by phase:**

| Phase | Primary Tools |
|-------|--------------|
| Research | research, research_compile, crawl_website, scrape_url, web_search, question |
| Create / Edit | write_article, edit_text, generate_script, write_artifact |
| Video | render_video, preview_video, export_video, edit_video |
| Distribute | Connector tools (YouTube, Gmail, Reddit, Twitter, Telegram) |
| Plan | create_plan, execute_plan, subagent_run, compose_run |

**Guidelines:**
- Research before writing — gather facts first
- Use sub-agents for complex multi-step content pipelines
- One content piece per message unless asked otherwise
- Use write_artifact for documents > 15 lines
- Verify rendered videos before distribution
```

### `core/prompt/toolcallGuide.ts`

Replace. Remove coding tool matrix. New content-focused guide:

```
### TOOL CALL DECISION GUIDE

**When to use each tool:**

| Situation | Tool |
|-----------|------|
| Need facts on a topic | research or web_search |
| Write a long-form article | write_article |
| Polish or revise existing text | edit_text |
| Create a video script | generate_script |
| Search a website for info | crawl_website or scrape_url |
| Ask the user a question | question |
| Create a deliverable document | write_artifact |
| Render a video | render_video |
| Publish to social media | Connector tools |

**Best practices:**
- Research first, then create
- One tool per meaningful action
- Use sub-agents for pipelines of 3+ steps
- Preview video before exporting
- Compose pipeline agents for repeatable workflows
```

### `core/prompt/system.md`

Keep base behavior rules. Replace line 1:

```
You are a content creation assistant. Follow these operating principles:
```

### `core/memory/contextController.ts`

Remove lines 17–23 (codebase exploration context). Replace with:

```ts
// If a project context is present, inject topic/audience/style info
if (projectContext) {
  contextBlock = `You are working on: "${projectContext.name}".
${projectContext.topic ? `Topic: ${projectContext.topic}` : ''}
${projectContext.audience ? `Audience: ${projectContext.audience}` : ''}
${projectContext.style ? `Style: ${projectContext.style}` : ''}`;
}
```

---

## Phase 3 — Remove Coding Tools

### Delete these files:
- `core/tools/system/runCommand.ts`
- Any file defining `read_file`, `edit_file`, `write_file`, `search_codebase`, `list_directory`, `grep`, `glob`

### Update `core/tools/allTools.ts`
Remove coding tools from the array. Keep only:
- `webSearchTool`
- `writeArtifactTool`
- All connector tools (gmail, github, youtube, telegram, reddit, twitter)

### Keep `core/tools/initToolRuntime.ts`
Content, video, plan, and subagent tool registrations stay.

---

## Phase 4 — Update Connector Prompts

### `core/models/connectorPrompts.ts`

Change each from "You have X connected. Use these tools when..." to a content-pipeline hook. Example:

**Before (Gmail):**
```
### GMAIL CONNECTOR
You have Gmail connected. Use these tools when the user asks you to send, read, or manage their emails.
```

**After:**
```
### GMAIL CONNECTOR
Gmail is connected, so you can:
- Send articles or scripts as email attachments
- Receive documents from collaborators via email
```

**Before (GitHub):**
```
### GITHUB CONNECTOR
You have GitHub connected. Use these tools when the user asks you to search code, manage issues, or pull requests.
```

**After (GitHub stays for content pipeline — e.g., hosting scripts, versioning content):**
```
### GITHUB CONNECTOR
GitHub is connected, so you can:
- Store and version content drafts and scripts
- Manage project repositories for content deliverables
```

**Before (YouTube):**
```
### YOUTUBE CONNECTOR
You have YouTube connected. Use these tools when the user asks you to search videos or manage their playlists.
```

**After:**
```
### YOUTUBE CONNECTOR
YouTube is connected, so you can:
- Publish rendered videos to YouTube
- Search for reference videos
- Manage playlists
```

Same pattern for Telegram, Reddit, Twitter.

---

## Phase 5 — Update Subagent Personalities

### `packages/subagent/src/personalities.ts`

**Line 24 — Explorer personality:**
```ts
// Before:
'You are a read-only exploration agent. Your purpose is to gather information, analyze code, and answer questions. '
// After:
'You are a research agent. Your purpose is to gather information on topics, analyze content, and answer questions. You do not create or modify content — leave that to the writer agent.'
```

**Line 14 — General personality (optional):**
```ts
// Before:
'You are a capable general-purpose agent. You have access to a full suite of tools for research, writing, editing, and content creation. '
// After:
'You are a capable general-purpose agent. You can research, write, edit, and create content. '
```
(Minor — just remove the "tool" reference)

---

## Phase 6 — Update Frontend

### `src/components/chat/NTabDropdown.tsx`
- Remove Explorer, Debug, Teamwork options
- Add Writer, Researcher, Video options
- Change labels/icons/colors to match personas

### `src/components/chat/UserBubble.tsx`
- Remove "Revert" button (unless needed for non-coding revert like drafts)
- If coding-revert, delete it

### `src/stores/projectStore.ts`
- Remove agent-specific state
- Keep `currentMode` but update defaults to 'writer' instead of 'explorer'

### Any other mode selectors / agent UI
- Search for `.agent`, `explorerAgent`, `debugAgent`, `teamworkAgent` imports in `src/`
- Update all references

---

## Phase 7 — Wire It Up

### `core/models/aiService.ts`

**Line ~139:**
```ts
// Before:
const agent = getAgentById(modeId ?? '');
const modePrompt = agent?.systemPrompt ?? '';

// After:
const persona = getPersonaById(modeId ?? '') ?? getPersonaById('writer');
const modePrompt = persona.systemPrompt;
```

**Line ~150:**
```ts
// Before:
const toolPolicy = isNewSession ? buildToolPolicy('new_task') : buildToolPolicy('continuing_session');

// After:
// No more tool policy — tool selection handled by AI SDK
const toolPolicy = '';  // or use new content-tool-policy
```

**Line ~164:**
```ts
// Before:
let fullSystemPrompt = getSmartSystemPrompt(modeAwarePrompt, projectContext, projectMemory) + connectorPrompt + '\n\n' + toolPolicy;

// After:
let fullSystemPrompt = getSmartSystemPrompt(modeAwarePrompt, projectContext, projectMemory) + connectorPrompt;
```

---

## Files to Create
- `core/persona/types.ts`
- `core/persona/index.ts`
- `core/persona/writer.ts`
- `core/persona/researcher.ts`
- `core/persona/video.ts`

## Files to Delete
- `core/agents/` (entire folder)
- `core/tools/system/runCommand.ts`
- All coding tool files (read_file, edit_file, write_file, search_codebase, list_directory, grep, glob)

## Files to Modify
- `core/prompt/systemPrompt.ts` — replace coding workflow with content workflow
- `core/prompt/toolPolicy.ts` — replace entire file
- `core/prompt/toolcallGuide.ts` — replace entire file
- `core/prompt/system.md` — update first line
- `core/memory/contextController.ts` — remove codebase exploration context
- `core/models/connectorPrompts.ts` — rephrase all connectors
- `core/models/aiService.ts` — swap getAgentById → getPersonaById, remove toolPolicy
- `core/tools/allTools.ts` — remove coding tools from array
- `packages/subagent/src/personalities.ts` — fix "analyze code" line
- `src/components/chat/NTabDropdown.tsx` — swap modes
- `src/components/chat/UserBubble.tsx` — remove revert
- `src/stores/projectStore.ts` — update defaults

## Files to Keep (no changes)
- `core/tools/initToolRuntime.ts`
- `core/tools/writeArtifactTool.ts`
- `core/config/models.ts`
- `core/reasoning/capabilities.ts`
- `packages/tool-runtime/` (all content/video/plan tools)
- `packages/subagent/src/bridge.ts` (subagent_run, compose_run)
- `packages/subagent/src/scheduler.ts`
- `packages/subagent/src/synthesizer.ts`
