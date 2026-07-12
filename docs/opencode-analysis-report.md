# opencode Repository Architecture Analysis Report

Generated from analysis of the codebase at `C:\Users\zephy\Documents\dok-tor`

---

## Table of Contents
1. [Tool Calling System](#1-tool-calling-system)
2. [Model Routes & Provider Serving](#2-model-routes--provider-serving)
3. [Subagent Spawning](#3-subagent-spawning)
4. [Build/Plan Mode Configuration](#4-buildplan-mode-configuration)
5. [Web UI Color Theme System](#5-web-ui-color-theme-system)
6. [Storage Types & Databases](#6-storage-types--databases)
7. [LLM Streaming to UI](#7-llm-streaming-to-ui)
8. [Right Side Panel (Git Changes Review)](#8-right-side-panel-git-changes-review)
9. [Prompt Input Box](#9-prompt-input-box)
10. [Reasoning Summaries Display](#10-reasoning-summaries-display)
11. [Component Extraction Guide](#11-component-extraction-guide)

---

## 1. Tool Calling System

### Architecture Overview
The tool system is split across two packages:
- **`@opencode-ai/llm`** (`packages/llm/src/tool.ts`): Provider-agnostic tool definitions for LLM requests
- **`@opencode-ai/core`** (`packages/core/src/tool/`): Runtime execution, registry, and permissions

### Tool Definition (llm/src/tool.ts:71-132)
```typescript
function make<Input, Output, Structured>(config: Config): Definition<Input, Structured>
```
- **Schema-driven**: Uses Effect Schema for input/output validation
- **toJsonSchema()**: Converts Effect Schema to JSON Schema for provider APIs
- **execute()**: Effect-based async function with Context (sessionID, agent, assistantMessageID, toolCallID)
- **toStructuredOutput()**: Optional transformation for structured tool results
- **toModelOutput()**: Optional conversion to model-facing content (text/file)

### Tool Registry (core/src/tool/registry.ts:23-121)
```typescript
interface Interface {
  materialize(permissions?: PermissionV2.Ruleset): Effect.Effect<Materialization>
  register(tools: Record<string, AnyTool>): Effect.Effect<void, RegistrationError, Scope.Scope>
}

interface Materialization {
  definitions: ToolDefinition[]  // JSON schemas for LLM
  settle(input: ExecuteInput): Effect.Effect<Settlement, ToolOutputStore.Error>
}
```
- **Two-tier registry**: Local (session-scoped) + Application (built-in) tools
- **Permissions**: Filtered via `whollyDisabled()` using wildcard matching
- **Settlement**: Decodes input → executes → encodes output → stores in ToolOutputStore
- **Staleness detection**: Tracks registration tokens to reject stale tool calls

### Built-in Tools (core/src/tool/)
| Tool | File | Description |
|------|------|-------------|
| `bash` | `bash.ts:52` | Shell command execution |
| `read` | `read.ts:52` | File reading with offset/limit |
| `write` | `write.ts:52` | File writing |
| `edit` | `edit.ts:52` | String replacement editing |
| `apply_patch` | `apply-patch.ts:52` | Unified diff application |
| `glob` | `glob.ts:52` | File pattern matching |
| `grep` | `grep.ts:52` | Regex file content search |
| `webfetch` | `webfetch.ts:52` | HTTP fetch with rendering |
| `websearch` | `websearch.ts:52` | Web search (Exa/Parallel) |
| `task` | `skill.ts:52` | Subagent invocation |
| `todowrite` | `todowrite.ts:52` | Todo list management |

### LLM Integration (llm/src/route/client.ts:274-295)
```typescript
streamPrepared: (prepared, request, runtime) => {
  const events = transport.frames(prepared, request, runtime)
    .pipe(Stream.mapEffect(decodeEvent(route)))
    .pipe(Stream.mapAccumEffect(
      () => protocol.stream.initial(request),
      protocol.stream.step,
      protocol.stream.onHalt ? { onHalt: protocol.stream.onHalt } : undefined
    ))
}
```
- Tools advertised via `protocol.body.from(request)` → JSON Schema
- Tool calls streamed as `LLMEvent.ToolCall` → settled locally → `LLMEvent.ToolResult` sent back

### Key Files
- `packages/llm/src/tool.ts:1-162` - Tool definition & runtime
- `packages/llm/src/route/client.ts:27-53` - Route interface with tool transport
- `packages/core/src/tool/registry.ts:1-147` - Tool registry & settlement
- `packages/core/src/tool/read-filesystem.ts` - File system read tool

---

## 2. Model Routes & Provider Serving

### Provider Abstraction (llm/src/providers/)
Each provider implements a **Route** composed of four orthogonal pieces:
```typescript
// llm/src/route/client.ts:182-199
interface MakeInput<Body, Frame, Event, State> {
  protocol: Protocol<Body, Frame, Event, State>  // API contract
  endpoint: Endpoint<Body>                        // Where to send
  auth: AuthDef                                   // Authentication
  framing: Framing<Frame>                         // Stream framing (SSE, WS, etc)
  headers?: (request) => Record<string, string>   // Cross-cutting headers
}
```

### Supported Providers (llm/src/providers/)
| Provider | File | Protocol |
|----------|------|----------|
| Anthropic | `anthropic.ts` | Messages API (SSE) |
| OpenAI | `openai.ts` | Chat Completions (SSE) |
| OpenAI-Compatible | `openai-compatible.ts` | Generic OpenAI-compatible |
| Google | `google.ts` | Gemini API |
| Azure | `azure.ts` | Azure OpenAI |
| OpenRouter | `openrouter.ts` | OpenRouter |
| GitHub Copilot | `github-copilot.ts` | Copilot API |
| XAI | `xai.ts` | Grok API |
| Amazon Bedrock | `amazon-bedrock.ts` | Bedrock |
| Cloudflare | `cloudflare.ts` | Workers AI |

### Protocol Layer (llm/src/protocols/)
- **Shared** (`shared.ts`): Base event parsing, error handling
- **Anthropic** (`anthropic.ts`): Message streaming, tool use, thinking blocks
- **OpenAI** (`openai.ts`): Chat completions, tool calls, reasoning
- **OpenAI Compatible** (`openai-compatible.ts`): Generic adapter

### Route Construction (llm/src/route/client.ts:303-339)
```typescript
export function make<Body, Frame, Event, State>(input: MakeInput): Route<Body, HttpPrepared<Frame>>
export function make<Body, Prepared, Frame, Event, State>(input: MakeTransportInput): Route<Body, Prepared>
```
- Composable: protocol + endpoint + auth + framing = complete route
- Model resolution: `route.model(input)` attaches provider + route to model ref

### Request Execution (llm/src/route/client.ts:344-379)
```typescript
const compile = Effect.fn("LLM.compile")(function* (request: LLMRequest) {
  const resolved = applyCachePolicy(resolveRequestOptions(request))
  const route = resolved.model.route
  const body = yield* route.body.from(resolved)  // Build provider body
  const prepared = yield* route.prepareTransport(body, resolved)  // HTTP prep
  return { request: resolved, route, body, prepared }
})
```
- **Caching**: Prompt caching via `cache-policy.ts` (OpenAI `promptCacheKey`, Anthropic `cache_control`)
- **Streaming**: `llm.stream(request)` → `Stream<LLMEvent, LLMError>`
- **Generation**: `llm.generate(request)` → `Effect<LLMResponse>` (folds stream)

### Authentication (llm/src/route/auth.ts:1-60)
```typescript
export const Auth = {
  none: Auth.of({ type: "none" }),
  bearer: (token: string) => Auth.of({ type: "bearer", token }),
  header: (name: string, value: string) => Auth.of({ type: "header", name, value }),
  query: (name: string, value: string) => Auth.of({ type: "query", name, value }),
}
```

### Key Files
- `packages/llm/src/route/client.ts:1-436` - Route composition & execution
- `packages/llm/src/route/executor.ts:1-385` - HTTP execution with retry/redaction
- `packages/llm/src/providers/*.ts` - Provider-specific routes
- `packages/llm/src/protocols/shared.ts` - Event decoding utilities
- `packages/llm/src/schema/events.ts` - LLMEvent types (text.delta, reasoning.delta, tool-call, etc.)

---

## 3. Subagent Spawning

### Agent Configuration (core/src/config/agent.ts:13-25)
```typescript
export class Info extends Schema.Class<Info>("ConfigV2.Agent")({
  model: Schema.String.pipe(Schema.optional),
  variant: Schema.String.pipe(Schema.optional),
  request: ConfigProvider.Request.pipe(Schema.optional),
  system: Schema.String.pipe(Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  mode: Schema.Literals(["subagent", "primary", "all"]).pipe(Schema.optional),
  hidden: Schema.Boolean.pipe(Schema.optional),
  color: Color.pipe(Schema.optional),
  steps: PositiveInt.pipe(Schema.optional),
  disabled: Schema.Boolean.pipe(Schema.optional),
  permissions: Permission.Ruleset.pipe(Schema.optional),
}) {}
```

### Agent Modes
| Mode | Description | Visibility |
|------|-------------|------------|
| `primary` | Main agents (build, plan) | Always in @ menu |
| `subagent` | Task-invoked agents | Hidden from @ unless `hidden: false` |
| `all` | Both | Both contexts |

### Built-in Subagents (core/src/plugin/agent.ts:156-182)
```typescript
// "general" - Multi-step researcher (mode: "subagent")
// "explore" - Codebase explorer with grep/glob/read only (mode: "subagent")
```
- **general**: Full tool access except `todowrite`, for parallel multi-step work
- **explore**: Read-only (grep, glob, read, webfetch, websearch), no edits

### Task Tool (core/src/tool/skill.ts:52-98)
```typescript
// The "task" tool invokes subagents
export const TaskTool = make({
  description: "Launch a subagent to perform a task",
  input: TaskInputSchema,
  execute: (input, context) => {
    // Creates new session with parentID link
    // Runs agent loop in background
    // Returns session ID for result retrieval
  }
})
```
- **Spawning**: Creates new `Session` with `parentID` referencing caller
- **Isolation**: Separate agent loop, own message history, own tool permissions
- **Communication**: Parent receives `session.next.step.ended` events from child
- **Lifecycle**: Child runs to completion or interrupt; results via session events

### Session Hierarchy (core/src/session.ts:186-190)
```typescript
parent_id: text,  // Links subagent session to parent
```
- Sessions form a tree via `parent_id`
- Queryable via `SessionRunCoordinator` for parent/child tracking

### Key Files
- `packages/core/src/config/agent.ts:1-25` - Agent schema
- `packages/core/src/plugin/agent.ts:100-206` - Built-in agent definitions
- `packages/core/src/tool/skill.ts:1-98` - Task/subagent tool
- `packages/core/src/session.ts:186` - parent_id in session table

---

## 4. Build/Plan Mode Configuration

### Plan Agent (core/src/plugin/agent.ts:137-154)
```typescript
draft.update(AgentV2.ID.make("plan"), (item) => {
  item.description = "Plan mode. Disallows all edit tools."
  item.mode = "primary"
  item.permissions.push(...PermissionV2.merge(defaults, [
    { action: "question", resource: "*", effect: "allow" },
    { action: "plan_exit", resource: "*", effect: "allow" },
    { action: "external_directory", resource: path.join(Global.Path.data, "plans", "*"), effect: "allow" },
    { action: "edit", resource: "*", effect: "deny" },          // Block all edits
    { action: "edit", resource: path.join(".opencode", "plans", "*.md"), effect: "allow" },  // Allow plan files
  ]))
})
```

### Plan Mode Mechanics
1. **Permissions**: Denies `edit` globally, allows only `.opencode/plans/*.md`
2. **Special Actions**: `plan_enter` / `plan_exit` control mode transitions
3. **Plan Storage**: Plans saved to `~/.local/share/opencode/plans/*.md`
4. **Agent Selection**: User switches to "plan" agent via @ menu or `/plan` command

### Plan Enter/Exit (core/src/plugin/agent.ts:116-117, 132-133, 143-144)
```typescript
// Default agent DENIES plan_enter/plan_exit
{ action: "plan_enter", resource: "*", effect: "deny" },
{ action: "plan_exit", resource: "*", effect: "deny" },

// Plan agent ALLOWS them
{ action: "plan_enter", resource: "*", effect: "allow" },
{ action: "plan_exit", resource: "*", effect: "allow" },
```

### Build Agent (core/src/plugin/agent.ts:124-135)
```typescript
draft.update(AgentV2.defaultID, (item) => {
  item.permissions.push(
    ...PermissionV2.merge(defaults, [
      { action: "question", resource: "*", effect: "allow" },
      { action: "plan_enter", resource: "*", effect: "allow" },  // Can enter plan mode
    ])
  })
})
```

### Key Files
- `packages/core/src/plugin/agent.ts:100-206` - Agent definitions with permissions
- `packages/core/src/permission.ts` - Permission ruleset evaluation

---

## 5. Web UI Color Theme System

### Theme Architecture (ui/src/theme/)
```
ui/src/theme/
├── color.ts              # OKLCH color space utilities, scale generation
├── context.tsx           # ThemeProvider, localStorage persistence
├── default-themes.ts     # Built-in theme definitions
├── themes/*.json         # 30+ theme files (Catppuccin, Dracula, etc.)
├── resolve.ts            # Theme token resolution to CSS variables
├── v2/resolve.ts         # V2 token system (newer)
└── types.ts              # Type definitions
```

### Color Space (ui/src/theme/color.ts:49-169)
- **OKLCH-based**: Perceptually uniform color space (L=Lightness, C=Chroma, H=Hue)
- **Scale Generation**: 12-step scales from seed color
- **Dark/Light**: Separate light step arrays per mode
- **Neutral Scale**: Generated from seed or explicit ink color

```typescript
// color.ts:133-169
function generateScale(seed: HexColor, isDark: boolean): HexColor[]
function generateNeutralScale(seed: HexColor, isDark: boolean, ink?: HexColor): HexColor[]
function generateAlphaScale(scale: HexColor[], isDark: boolean): HexColor[]
```

### Theme Context (ui/src/theme/context.tsx:114-372)
```typescript
const STORAGE_KEYS = {
  THEME_ID: "opencode-theme-id",
  COLOR_SCHEME: "opencode-color-scheme",
  THEME_CSS_LIGHT: "opencode-theme-css-light",
  THEME_CSS_DARK: "opencode-theme-css-dark",
} as const

export const { use: useTheme, provider: ThemeProvider } = createSimpleContext({
  init: (props) => {
    // Loads from localStorage, applies to :root via <style id="oc-theme">
    // Supports: light/dark/system, theme preview, 30+ built-in themes
  }
})
```

### CSS Variable Output (ui/src/theme/resolve.ts:1-25536)
- **V1 tokens**: `--text-base`, `--background-base`, `--border-base`, etc.
- **V2 tokens**: `--v2-text-text`, `--v2-surface-surface`, `--v2-state-fg-success`, etc.
- **Agent colors**: `--icon-agent-build-base`, `--v2-agent-build-solid`, etc.
- **Syntax highlighting**: `--syntax-*` variables

### Built-in Themes (30+)
ocat-2, amoled, aura, ayu, carbonfox, catppuccin*, cobalt2, cursor, dracula, everforest, flexoki, github, gruvbox, kanagawa, lucent-orng, material, matrix, mercury, monokai, nightowl, nord, one-dark, onedarkpro, opencode, orng, osaka-jade, palenight, rosepine, shadesofpurple, solarized, synthwave84, tokyonight, vercel, vesper, zenburn

### Key Files
- `packages/ui/src/theme/color.ts:1-299` - Color math & scale generation
- `packages/ui/src/theme/context.tsx:1-373` - ThemeProvider, persistence, application
- `packages/ui/src/theme/resolve.ts:1-25536` - Token → CSS variable resolution
- `packages/ui/src/theme/v2/resolve.ts` - V2 token system

---

## 6. Storage Types & Databases

### Database Layer (core/src/database/)
| File | Purpose |
|------|---------|
| `sqlite.bun.ts` | Bun native SQLite (better-sqlite3 compatible) |
| `sqlite.node.ts` | Node.js SQLite (better-sqlite3) |
| `sqlite.ts` | Abstract interface |
| `schema.gen.ts` | Drizzle ORM schema (generated) |
| `migration.ts` | Migration runner |
| `migration/*.ts` | 20+ migration files |

### Core Tables (database/schema.gen.ts)
```sql
-- Sessions
CREATE TABLE `session` (
  `id` text PRIMARY KEY,
  `project_id` text NOT NULL REFERENCES project(id),
  `workspace_id` text,
  `parent_id` text,              -- Subagent hierarchy
  `slug` text NOT NULL,
  `directory` text NOT NULL,
  `path` text,
  `title` text NOT NULL,
  `version` text NOT NULL,
  `agent` text,                  -- Current agent
  `model` text,                  -- Serialized model ref
  `cost` real DEFAULT 0,
  `tokens_input` integer DEFAULT 0,
  `tokens_output` integer DEFAULT 0,
  `tokens_reasoning` integer DEFAULT 0,
  `tokens_cache_read` integer DEFAULT 0,
  `tokens_cache_write` integer DEFAULT 0,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL,
  `time_compacting` integer,
  `time_archived` integer
);

-- Messages (durable projection)
CREATE TABLE `session_message` (
  `id` text PRIMARY KEY,
  `session_id` text NOT NULL REFERENCES session(id),
  `type` text NOT NULL,          -- user, assistant, system, shell, compaction
  `seq` integer NOT NULL,        -- Global sequence
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL,
  `data` text NOT NULL           -- JSON message
);

-- Event Store (Event Sourcing)
CREATE TABLE `event` (
  `id` text PRIMARY KEY,
  `aggregate_id` text NOT NULL,
  `seq` integer NOT NULL,
  `type` text NOT NULL,
  `data` text NOT NULL           -- JSON event
);

-- Tool Output Store (bounded blobs)
CREATE TABLE `tool_output` (
  `session_id` text NOT NULL,
  `tool_call_id` text NOT NULL,
  `output` text NOT NULL,
  `output_paths` text,           -- JSON array
  PRIMARY KEY (session_id, tool_call_id)
);
```

### Storage Abstractions
| Layer | Package | Purpose |
|-------|---------|---------|
| **SQLite** | `core/database` | Primary persistence (sessions, messages, events) |
| **Event Store** | `core/event.ts` | Append-only event log per aggregate |
| **Session Store** | `core/session/store.ts` | Message/context projection |
| **Tool Output Store** | `core/tool-output-store.ts` | Bounded tool output blobs |
| **Snapshot Store** | `core/snapshot.ts` | Filesystem snapshots for revert/diff |
| **Session Input** | `core/session/input.ts` | Pending user inputs (steer/queue) |

### Key Files
- `packages/core/src/database/schema.gen.ts:1-274` - Full DDL
- `packages/core/src/database/sqlite.bun.ts:1-6877` - Bun SQLite impl
- `packages/core/src/session/store.ts:1-2622` - Message projection
- `packages/core/src/event.ts:1-25648` - Event store
- `packages/core/src/tool-output-store.ts:1-8180` - Tool output blobs

---

## 7. LLM Streaming to UI

### End-to-End Flow
```
Provider (SSE/WS)
    │
    ▼
llm/src/route/transport/http.ts / websocket.ts  ──► Frames (bytes → protocol frames)
    │
    ▼
llm/src/route/client.ts:279-295  ──► protocol.stream.step(frame) → LLMEvent
    │
    ▼
SessionRunner (core/src/session/runner/llm.ts:232-273)  ──► publisher.publish(event)
    │
    ▼
SessionEvent (protocol/groups/session.ts:332)  ──► SSE Stream: /api/session/:id/event
    │
    ▼
Frontend (session-ui)  ──► MessagePartDisplay → PacedMarkdown → Markdown
```

### Streaming Events (schema/src/session-event.ts:197-271)
```typescript
// Text streaming
Text.Started    { assistantMessageID, textID }
Text.Delta      { assistantMessageID, textID, delta }      // Live fragment
Text.Ended      { assistantMessageID, textID, text }       // Complete

// Reasoning streaming (SEPARATE from text!)
Reasoning.Started { assistantMessageID, reasoningID, providerMetadata }
Reasoning.Delta   { assistantMessageID, reasoningID, delta }   // Live fragment
Reasoning.Ended   { assistantMessageID, reasoningID, text, providerMetadata }  // Complete
```

### Server-Sent Events (server/src/handlers/session.ts:327-343)
```typescript
HttpApiEndpoint.get("session.events", "/api/session/:sessionID/event", {
  query: { after: Schema.NumberFromString.pipe(Schema.optional) },
  success: HttpApiSchema.StreamSse({ data: SessionEvent.Durable }),  // SSE!
  error: SessionNotFoundError,
})
```

### Frontend Consumption (app/src/pages/session.tsx)
```typescript
// Connects to SSE, feeds into session store
const events = session.events({ sessionID, after: lastSeq })
// Events update SessionMessage parts via SessionMessageUpdater
```

### Message Part Rendering (session-ui/src/components/message-part.tsx:322-333)
```typescript
function createPacedValue(getValue: () => string, live?: () => boolean) {
  // Renders incrementally: 24ms pace, snaps at punctuation
  // Immediate render if < 512 chars remaining
}
```

### Reasoning vs Text Separation
- **Different event types**: `session.next.reasoning.delta` vs `session.next.text.delta`
- **Different part types**: `AssistantReasoning` vs `AssistantText` in session-message.ts:140-157
- **Different rendering**: `ReasoningPartDisplay` (collapsible, summary) vs `TextPartDisplay` (markdown)
- **UI Toggle**: `showReasoningSummaries` prop controls visibility

### Key Files
- `packages/llm/src/route/transport/http.ts` - SSE framing
- `packages/llm/src/route/client.ts:279-295` - Stream decoding
- `packages/core/src/session/runner/llm.ts:232-273` - Event publishing
- `packages/protocol/src/groups/session.ts:332` - SSE endpoint
- `packages/schema/src/session-event.ts:197-271` - Event definitions
- `packages/session-ui/src/components/message-part.tsx:322-333` - Paced rendering
- `packages/session-ui/src/components/message-part.tsx:1693-1710` - ReasoningPartDisplay

---

## 8. Right Side Panel (Git Changes Review)

### Component Hierarchy
```
SessionReview (session-ui/src/components/session-review.tsx:1-656)
    │
    ├── SessionReviewV2 (session-ui/src/v2/components/session-review-v2.tsx:1-338)
    │       └── SessionFilePanelV2
    │
    ├── SessionDiff (session-ui/src/components/session-diff.ts)
    │       └── Uses @pierre/diffs for diff computation
    │
    └── FileComponent (ui context) ──► Diff view (unified/split)
```

### Git Diff Computation
```typescript
// session-review.tsx:65-70
type RawReviewDiff = (SnapshotFileDiff | VcsFileDiff) & { preloaded?: PreloadMultiFileDiffResult }
type ReviewDiff = ((SnapshotFileDiff & { file: string }) | VcsFileDiff) & { preloaded? }
```

- **SnapshotFileDiff**: From filesystem snapshots (pre/post tool execution)
- **VcsFileDiff**: From git (working tree vs HEAD)
- **Preloading**: `@pierre/diffs/ssr` for server-side diff computation

### Diff Rendering (session-review.tsx:570-639)
```typescript
<Dynamic
  component={fileComponent}
  mode="diff"
  fileDiff={diff().fileDiff}
  preloadedDiff={diff().preloaded}
  diffStyle={diffStyle()}           // "unified" | "split"
  enableLineSelection={onLineComment != null}
  enableGutterUtility={onLineComment != null}
  onLineSelected={handleLineSelected}
  onLineSelectionEnd={handleLineSelectionEnd}
  annotations={commentsUi.annotations()}
  renderAnnotation={commentsUi.renderAnnotation}
  renderGutterUtility={commentsUi.renderGutterUtility}
  media={{ mode: "auto", path: file, deleted: status === "deleted", readFile }}
/>
```

### Features
- **File tree sidebar**: Filterable, resizable (200-480px)
- **Diff styles**: Unified / Split view toggle
- **Expand/Collapse**: Per-file, show/hide non-diff lines
- **Large diff handling**: >500 changed lines shows placeholder with "Render anyway"
- **Line comments**: Selection → comment thread (createLineCommentController)
- **File navigation**: `<` `>` keys cycle files

### Data Flow
1. Session stores `summary.diffs` on assistant messages (session-message.ts:171-175)
2. `SessionTurn` reads diffs from message summary (session-turn.tsx:241-255)
3. Passed to `SessionReview` via `files` prop (active file list)
4. `SessionReview` fetches full diff via `props.preview` (FileComponent in diff mode)

### Key Files
- `packages/session-ui/src/components/session-review.tsx:1-656` - Main review panel
- `packages/session-ui/src/v2/components/session-review-v2.tsx:1-338` - V2 rewrite
- `packages/session-ui/src/components/session-diff.ts:1-5036` - Diff normalization
- `packages/core/src/git.ts:1-36731` - Git operations (diff, status, log)

---

## 9. Prompt Input Box

### Component (app/src/components/prompt-input.tsx:206-408)
```typescript
export interface PromptInputProps {
  state?: PromptInputState        // Text, attachments, agents, history
  history?: PromptInputHistory    // Persisted history (localStorage)
  submission?: PromptInputSubmission  // onSubmit, onCancel callbacks
  controls: PromptInputControls   // Agents, model, session, layout
}
```

### Features
- **Multi-line editor**: Textarea with auto-resize
- **Attachments**: File upload, image paste, drag-drop
- **Agent mentions**: `@agent` autocomplete (slash-popover.tsx)
- **History**: Up/Down arrow navigation, persisted to localStorage
- **Keyboard shortcuts**: Enter=submit, Shift+Enter=newline, Escape=cancel
- **Transient state**: Draft preservation across navigation

### During Chat Session (app/src/pages/session.tsx:384, 2049)
```typescript
const inputController = createPromptInputController({
  sessionKey,
  sessionID: session.id,
  queryOptions: { agents, providers },
  model: local.model,
})

<PromptInput
  state={promptInputState}
  history={promptInputHistory}
  submission={{
    onSubmit: (input) => session.prompt({ ... }),
    onCancel: () => session.interrupt(),
  }}
  controls={inputController}
/>
```
- **Submission**: Calls `session.prompt()` → admits input → wakes runner
- **Interrupt**: `session.interrupt()` stops active generation

### Outside Chat Session (app/src/pages/new-session.tsx:66, 154)
```typescript
const inputController = createPromptInputController({
  sessionKey: "new",
  sessionID: undefined,  // No active session
  ...
})

<PromptInput
  submission={{
    onSubmit: (input) => navigateToNewSession(input),
    onCancel: () => {},
  }}
  controls={inputController}
/>
```
- **No sessionID**: Creates new session on submit
- **Project selector**: Visible when no session
- **Draft persistence**: Survives page refresh via localStorage

### Controller (app/src/pages/session/composer/session-composer-controls.ts:21-59)
```typescript
export function createPromptInputController(input: {
  sessionKey: Accessor<string>
  sessionID: Accessor<string | undefined>
  queryOptions: { agents, providers }
  model?: ModelSelection
}) {
  return createMemo<PromptInputControls>(() => ({
    agents: { available, options, current, loading, visible, select },
    model: { selection, paid, loading },
    session: { id: input.sessionID(), tabs, reviewPanel: view.reviewPanel },
    newLayoutDesigns: settings.general.newLayoutDesigns(),
  }))
}
```

### Key Files
- `packages/app/src/components/prompt-input.tsx:1-2582` - Main component
- `packages/app/src/components/prompt-input/transient-state.ts` - Draft persistence
- `packages/app/src/components/prompt-input/history.ts` - History management
- `packages/app/src/components/prompt-input/submit.ts` - Submission logic
- `packages/app/src/pages/session/composer/session-composer-controls.ts:21-59` - Controller

---

## 10. Reasoning Summaries Display

### Data Model (schema/src/session-message.ts:147-157)
```typescript
export interface AssistantReasoning {
  type: "reasoning"
  id: string
  text: string
  providerMetadata: ProviderMetadata | undefined
  time: { created: number; completed: number | undefined }
}
```

### Streaming Events (schema/src/session-event.ts:234-271)
```typescript
Reasoning.Started { assistantMessageID, reasoningID, providerMetadata }
Reasoning.Delta   { assistantMessageID, reasoningID, delta }      // Live
Reasoning.Ended   { assistantMessageID, reasoningID, text, providerMetadata }  // Complete
```

### Message Updater (core/src/session/message-updater.ts:343-373)
```typescript
"session.next.reasoning.started": (event) =>
  updateOwnedAssistant(event.data.assistantMessageID, (draft) => {
    draft.content.push(AssistantReasoning.make({ type: "reasoning", id: event.data.reasoningID, text: "", ... }))
  }),
"session.next.reasoning.delta": (event) =>
  updateOwnedAssistant(event.data.assistantMessageID, (draft) => {
    const match = latestReasoning(draft, event.data.reasoningID)
    if (match) match.text += event.data.delta
  }),
"session.next.reasoning.ended": (event) =>
  updateOwnedAssistant(event.data.assistantMessageID, (draft) => {
    const match = latestReasoning(draft, event.data.reasoningID)
    if (match) { match.text = event.data.text; match.time.completed = event.data.timestamp; ... }
  }),
```

### Rendering (session-ui/src/components/message-part.tsx:1693-1710)
```typescript
PART_MAPPING["reasoning"] = function ReasoningPartDisplay(props) {
  const streaming = createMemo(() => props.message.role === "assistant" && !props.message.time.completed)
  const text = () => readPartText(data.store.part_text_accum_delta, part())

  return (
    <Show when={text()}>
      <div data-component="reasoning-part" data-timeline-part-id={part().id}>
        <Show when={streaming()} fallback={<Markdown text={text()} cacheKey={part().id} streaming={false} />}>
          <PacedMarkdown text={text()} cacheKey={part().id} streaming={streaming()} />
        </Show>
      </div>
    </Show>
  )
}
```

### Summary Extraction (session-turn.tsx:352-368)
```typescript
const assistantDerived = createMemo(() => {
  let visible = 0
  let reason: string | undefined
  const show = showReasoningSummaries()
  for (const message of assistantMessages()) {
    for (const part of parts) {
      if (partState(part, show) === "visible") visible++
      if (part.type === "reasoning" && part.text) {
        const h = heading(part.text)  // Extracts first markdown heading
        if (h) reason = h
      }
    }
  }
  return { visible, reason }
})
```

### Thinking Indicator (session-turn.tsx:371-376)
```typescript
const showThinking = createMemo(() => {
  if (!working() || !!error()) return false
  if (status().type === "retry") return false
  if (showReasoningSummaries()) return assistantVisible() === 0
  return true
})

// Renders:
<Show when={showThinking()}>
  <div data-slot="session-turn-thinking">
    <TextShimmer text={i18n.t("ui.sessionTurn.status.thinking")} />
    <Show when={!showReasoningSummaries()}>
      <TextReveal text={reasoningHeading()} class="session-turn-thinking-heading" travel={25} duration={700} />
    </Show>
  </div>
</Show>
```

### Separation from Normal Text
| Aspect | Reasoning | Normal Text |
|--------|-----------|-------------|
| **Event type** | `reasoning.*` | `text.*` |
| **Part type** | `AssistantReasoning` | `AssistantText` |
| **Display** | Collapsible, summary heading | Inline markdown |
| **Streaming** | Separate delta events | Separate delta events |
| **Toggle** | `showReasoningSummaries` prop | Always visible |
| **Thinking UI** | Shows heading when no other content | N/A |

### Key Files
- `packages/schema/src/session-message.ts:147-157` - Reasoning part schema
- `packages/schema/src/session-event.ts:234-271` - Reasoning events
- `packages/core/src/session/message-updater.ts:343-373` - Event → message update
- `packages/session-ui/src/components/message-part.tsx:1693-1710` - ReasoningPartDisplay
- `packages/session-ui/src/components/session-turn.tsx:352-376` - Summary extraction & thinking UI

---

## 11. Component Extraction Guide

### For Each Major Component: Files, Interfaces, Dependencies

---

#### A. Tool Calling System
**Extract to**: `@myproj/tool-runtime`

| File | Purpose | Dependencies |
|------|---------|--------------|
| `packages/llm/src/tool.ts` | Tool definition, JSON Schema conversion | `effect`, `@opencode-ai/llm/schema` |
| `packages/llm/src/tool-runtime.ts` | Tool execution context | `effect`, `llm/src/tool.ts` |
| `packages/core/src/tool/tool.ts` | Core tool definition (permission, settle) | `effect`, `@opencode-ai/llm` |
| `packages/core/src/tool/registry.ts` | Tool registry, materialization, settlement | `effect`, `core/src/tool/tool.ts`, `core/src/permission.ts` |
| `packages/core/src/tool/*.ts` | Built-in tool implementations | `effect`, `core/src/tool/tool.ts`, `core/src/fs-util.ts` |

**Key Interfaces**:
```typescript
// llm/src/tool.ts:71
make<Input, Output, Structured>(config: Config): Definition<Input, Structured>

// core/src/tool/registry.ts:23
interface Interface {
  materialize(permissions?: Ruleset): Effect<Materialization>
  register(tools: Record<string, AnyTool>): Effect<void, RegistrationError, Scope>
}
```

---

#### B. Model Routes & Providers
**Extract to**: `@myproj/llm-providers`

| File | Purpose |
|------|---------|
| `packages/llm/src/route/client.ts` | Route composition, request compilation, streaming |
| `packages/llm/src/route/executor.ts` | HTTP execution, retry, redaction |
| `packages/llm/src/route/transport/http.ts` | SSE framing |
| `packages/llm/src/route/transport/websocket.ts` | WebSocket framing |
| `packages/llm/src/providers/*.ts` | Provider-specific routes |
| `packages/llm/src/protocols/shared.ts` | Event decoding utilities |
| `packages/llm/src/protocols/anthropic.ts` | Anthropic protocol |
| `packages/llm/src/protocols/openai.ts` | OpenAI protocol |

**Key Interfaces**:
```typescript
// llm/src/route/client.ts:141
interface Interface {
  prepare: <Body>(request: LLMRequest) => Effect<PreparedRequest<Body>, LLMError>
  stream: (request: LLMRequest) => Stream<LLMEvent, LLMError>
  generate: (request: LLMRequest) => Effect<LLMResponse, LLMError>
}

// llm/src/route/client.ts:182
interface MakeInput<Body, Frame, Event, State> {
  protocol: Protocol<Body, Frame, Event, State>
  endpoint: Endpoint<Body>
  auth: AuthDef
  framing: Framing<Frame>
}
```

---

#### C. Subagent Spawning
**Extract to**: `@myproj/subagent`

| File | Purpose |
|------|---------|
| `packages/core/src/tool/skill.ts` | Task tool (subagent launcher) |
| `packages/core/src/plugin/agent.ts` | Built-in agent definitions |
| `packages/core/src/config/agent.ts` | Agent schema |
| `packages/core/src/session.ts` | Session creation with parent_id |

**Key Interfaces**:
```typescript
// core/src/tool/skill.ts:52
TaskInputSchema = {
  description: string
  subagent_type: "general" | "explore" | "build" | "plan" | "review" | "writer"
  prompt: string
}

// core/src/session.ts:186
parent_id: text  // Links subagent session to parent
```

---

#### D. Plan Mode
**Extract to**: `@myproj/plan-mode`

| File | Purpose |
|------|---------|
| `packages/core/src/plugin/agent.ts:137-154` | Plan agent definition (edit deny, plan file allow) |
| `packages/core/src/permission.ts` | Permission evaluation |

**Config**:
```typescript
// Plan agent permissions
{ action: "edit", resource: "*", effect: "deny" }
{ action: "edit", resource: ".opencode/plans/*.md", effect: "allow" }
{ action: "plan_enter", resource: "*", effect: "allow" }
{ action: "plan_exit", resource: "*", effect: "allow" }
```

---

#### E. Theme System
**Extract to**: `@myproj/ui-theme`

| File | Purpose |
|------|---------|
| `packages/ui/src/theme/color.ts` | OKLCH math, scale generation |
| `packages/ui/src/theme/context.tsx` | ThemeProvider, localStorage, CSS injection |
| `packages/ui/src/theme/resolve.ts` | Token → CSS variable resolution |
| `packages/ui/src/theme/v2/resolve.ts` | V2 token system |
| `packages/ui/src/theme/themes/*.json` | 30+ theme definitions |

**Usage**:
```typescript
import { ThemeProvider, useTheme } from "@myproj/ui-theme"

<ThemeProvider defaultTheme="catppuccin">
  <App />
</ThemeProvider>

// In components:
const { themeId, mode, setTheme, setColorScheme } = useTheme()
```

---

#### F. Storage/Database
**Extract to**: `@myproj/storage`

| File | Purpose |
|------|---------|
| `packages/core/src/database/sqlite.bun.ts` | Bun SQLite adapter |
| `packages/core/src/database/sqlite.node.ts` | Node SQLite adapter |
| `packages/core/src/database/schema.gen.ts` | Drizzle schema |
| `packages/core/src/event.ts` | Event store |
| `packages/core/src/session/store.ts` | Session/message projection |
| `packages/core/src/tool-output-store.ts` | Tool output blobs |
| `packages/core/src/snapshot.ts` | Filesystem snapshots |

---

#### G. LLM Streaming
**Extract to**: `@myproj/llm-stream`

| File | Purpose |
|------|---------|
| `packages/llm/src/route/transport/http.ts` | SSE framing |
| `packages/llm/src/route/client.ts:279-295` | Stream decoding |
| `packages/core/src/session/runner/llm.ts:232-273` | Event publishing |
| `packages/protocol/src/groups/session.ts:332` | SSE endpoint |
| `packages/schema/src/session-event.ts:197-271` | Event types (text/reasoning deltas) |
| `packages/session-ui/src/components/message-part.tsx:322-333` | Paced rendering |

**Frontend Consumption**:
```typescript
// Connect to SSE
const events = session.events({ sessionID, after: lastSeq })
// Events update session store → MessagePartDisplay renders
```

---

#### H. Git Diff Panel
**Extract to**: `@myproj/git-diff-panel`

| File | Purpose |
|------|---------|
| `packages/session-ui/src/components/session-review.tsx` | Main review panel |
| `packages/session-ui/src/v2/components/session-review-v2.tsx` | V2 rewrite |
| `packages/session-ui/src/components/session-diff.ts` | Diff normalization |
| `packages/core/src/git.ts` | Git operations |

**Props**:
```typescript
interface SessionReviewV2Props {
  title?: JSX.Element
  files: string[]
  activeFile?: string
  onSelectFile: (file: string) => void
  diffStyle: "unified" | "split"
  onDiffStyleChange: (style) => void
  expandMode: "expand" | "collapse"
  onExpandModeChange: (mode) => void
  preview?: JSX.Element  // FileComponent in diff mode
  hasDiffs: boolean
}
```

---

#### I. Prompt Input Box
**Extract to**: `@myproj/prompt-input`

| File | Purpose |
|------|---------|
| `packages/app/src/components/prompt-input.tsx` | Main component |
| `packages/app/src/components/prompt-input/transient-state.ts` | Draft persistence |
| `packages/app/src/components/prompt-input/history.ts` | History (localStorage) |
| `packages/app/src/components/prompt-input/submit.ts` | Submission logic |
| `packages/app/src/components/prompt-input/slash-popover.tsx` | @mentions, /commands |
| `packages/app/src/pages/session/composer/session-composer-controls.ts` | Controller factory |

**Props**:
```typescript
interface PromptInputProps {
  state?: PromptInputState      // text, attachments, agents
  history?: PromptInputHistory  // persisted history
  submission?: {
    onSubmit: (input: PromptInputSubmission) => void
    onCancel: () => void
  }
  controls: PromptInputControls  // agents, model, session, layout
}
```

---

#### J. Reasoning Summaries
**Extract to**: `@myproj/reasoning-display`

| File | Purpose |
|------|---------|
| `packages/schema/src/session-message.ts:147-157` | Reasoning part schema |
| `packages/schema/src/session-event.ts:234-271` | Reasoning events |
| `packages/core/src/session/message-updater.ts:343-373` | Event handling |
| `packages/session-ui/src/components/message-part.tsx:1693-1710` | ReasoningPartDisplay |
| `packages/session-ui/src/components/session-turn.tsx:352-376` | Summary extraction, thinking UI |

**Key Logic**:
```typescript
// Separate event streams for reasoning vs text
Reasoning.Delta → AssistantReasoning part → ReasoningPartDisplay (collapsible)
Text.Delta → AssistantText part → Markdown rendering

// Summary extraction: first markdown heading in reasoning text
const h = heading(part.text)  // Returns heading text or undefined
```

---

## Summary: Architecture Highlights

1. **Effect.ts throughout**: All async operations, streams, and dependency injection use Effect
2. **Event Sourcing**: Sessions persisted as event streams; projections for read models
3. **Separation of concerns**: Protocol (llm) ↔ Runtime (core) ↔ UI (session-ui/app) cleanly separated
4. **Streaming-first**: All LLM output streamed as granular events (text.delta, reasoning.delta, tool.progress)
5. **Reasoning as first-class**: Separate event types, part types, and UI for reasoning vs text
6. **Theme via CSS variables**: OKLCH-generated scales applied to `:root` via injected `<style>`
7. **Subagents as sessions**: Task tool creates child sessions with `parent_id` linkage
8. **Plan mode via permissions**: Edit deny + plan file allow + special enter/exit actions
9. **Git diff via snapshots**: Pre/post tool execution snapshots + VCS diff for review panel
10. **Input box reusable**: Same PromptInput works in/out of sessions via controller factory