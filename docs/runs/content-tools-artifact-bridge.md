# Content Tools → Doc/Pdf Artifact Bridge

## Goal

Make the 4 Effect.ts content tools (`write_article`, `edit_text`, `research`, `generate_script`) produce `doc`/`pdf` artifacts that render through the existing `FilePreviewCard` + `FilePanel` pipeline — the same way `write_artifact` does.

## Architecture

The existing rendering pipeline is 3 steps:

```
LLM tool call → mapUIMessageToLegacyMessage() → AssistantBubble → FilePreviewCard → FilePanel
                          │                           │
                     Extracts files[]             Reads + animates
                     from toolInvocations         write_artifact
```

We extend step 1 and step 2. Step 3 (`FilePreviewCard` → `FilePanel`) stays untouched — already handles `doc` and `pdf`.

## Content Tool Output Mapping

| Tool | Output shape | Artifact type | File fields |
|------|-------------|---------------|-------------|
| `write_article` | `{ articleId, title, content, wordCount, version }` | `doc` | `identifier: result.articleId`, `title: result.title`, `content: result.content` |
| `edit_text` | `{ text, changes, version }` | `doc` | `identifier: toolCallId`, `title: "Edited Text"`, `content: result.text` |
| `research` | `{ summary, sources[], partial? }` | `pdf` | `identifier: toolCallId`, `title: summary first 50 chars`, `content: summary + sources serialized` |
| `generate_script` | `{ scriptId, scenes[], totalDuration }` | `doc` | `identifier: result.scriptId`, `title: "Video Script"`, `content: scenes serialized to text` |
| `question` | `{ answer }` | skip | Not an artifact — human-in-the-loop tool, no file output |

## Changes

### 1. `src/lib/chatUtils.ts` — `mapUIMessageToLegacyMessage()`

After the existing `write_artifact` file extraction lines, add extraction for content tool results.

Key difference from `write_artifact`:
- `write_artifact` reads content from `args.content` (LLM-generated, passed in the call)
- Content tools generate content inside `execute` — the output comes back as the tool's **result**, not args

So instead of reading `call.args.content`, we read `call.result.<outputField>`.

**Extraction logic to add:**

```
For each toolInvocation where state === 'result':
  if toolName === 'write_article' && result?.content:
    → FileItem { type: 'doc',  identifier: result.articleId, title: result.title, content: result.content }
  if toolName === 'edit_text' && result?.text:
    → FileItem { type: 'doc',  identifier: toolCallId,       title: "Edited Text", content: result.text }
  if toolName === 'research' && result?.summary:
    → FileItem { type: 'pdf',  identifier: toolCallId,       title: summary heading, content: serializeResearch(result) }
  if toolName === 'generate_script' && result?.scenes:
    → FileItem { type: 'doc',  identifier: result.scriptId,   title: "Video Script", content: serializeScenes(result.scenes) }
```

**Helper serializers (inline or small utils):**

```
serializeResearch(result):
  result.summary + "\n\n---\n\n" + result.sources.map(s => "- " + s.title + "\n  " + s.snippet).join("\n")

serializeScenes(scenes):
  scenes.map(s => "Scene " + s.sceneNumber + " (" + s.duration + "s)\n" + s.narration + "\n" + s.visualDescription).join("\n\n---\n\n")
```

### 2. `src/components/chat/AssistantBubble.tsx`

Change `hasWriteArtifact` detection to recognize all artifact-producing tools:

```typescript
// Before:
const hasWriteArtifact = toolInvocations?.some((ti) => ti.toolName === 'write_artifact');

// After:
const ARTIFACT_TOOL_NAMES = new Set([
  'write_artifact', 'write_article', 'edit_text', 'research', 'generate_script'
]);
const hasWriteArtifact = toolInvocations?.some((ti) => ARTIFACT_TOOL_NAMES.has(ti.toolName));
```

No other changes in AssistantBubble. The `artifactCall` data extraction already falls back to `files[0]` when artifact information is needed:

```typescript
const artifactTitle = artifactCall?.args?.title
  || artifactCall?.args?.identifier
  || files?.[0]?.title         // ← content tool FileItems have title here
  || files?.[0]?.identifier
  || '';
```

### 3. `core/models/aiService.ts`

After the bridge is built, enable content tools:

```typescript
const runtimeTools = buildRuntimeTools(undefined, true);  // ← false → true
```

## What Stays Unchanged

| File | Why |
|------|-----|
| `FilePreviewCard.tsx` | Already renders `doc` and `pdf` types with download + preview |
| `PdfPreview.tsx` | Uses `pdf-lib` to render PDF content in an iframe |
| `DocPreview.tsx` | Converts markdown-style content to styled HTML in iframe |
| `FilePanel.tsx` | Already handles all file types |
| `useFilePanel.ts` | Deduplication + auto-open works on any FileItem[] |
| `useWriteArtifactStream.ts` | Animation hook — driven by `hasWriteArtifact` boolean, content-agnostic |
| All `packages/tool-runtime/` content tool files | No changes needed — they already produce structured output |

## Testing the Bridge

1. Start a chat with the LLM
2. Ask it to "write an article about TypeScript generics"
3. The LLM should call `write_article({ topic: "TypeScript generics" })`
4. After execution, a doc artifact card should appear in the chat bubble
5. Click the card → FilePanel opens with DocPreview showing the content
6. Repeat for research (pdf artifact), edit_text, and generate_script

## Edge Cases

- **Tool errors**: If a content tool throws, the `toolInvocations` entry has `state: 'result'` but `result` may be an error object. Check `result?.content` / `result?.summary` etc. before extracting.
- **Duplicate identifiers**: Content tools use randomUUID for IDs (write_article, generate_script). Edit_text and research use toolCallId as identifier. No collision risk with `write_artifact`'s user-provided identifiers.
- **No content before/after**: Content tools may not have `contentBeforeTool` text. The animation will skip from `idle` directly to `done` (handled by `useWriteArtifactStream` — it has the `idle → done` fast-path when tool is already complete).
