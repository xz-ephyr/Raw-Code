# Adapters: Bridging AI SDK → Native LLM Events

## Purpose

The adapters in this directory bridge the gap between the existing Vercel AI SDK integration
and `@doktor/llm-providers`'s native `LLMEvent` stream architecture.

During the phased migration, adapters let the app continue using `streamText()` while
piping its output into the native event pipeline (event bus → SSE endpoint → frontend).
Once every provider has a native protocol, these adapters are removed.

## Files

### `from-ai-sdk.ts` — AI SDK → LLMEvent Stream

Converts `streamText().fullStream` (an `AsyncIterable` of AI SDK v6 stream parts) into
an `Effect Stream<LLMEvent>`.

**Input:** The return value of `streamText()` from `'ai'` (AI SDK v6)

**Output:** `Stream<LLMEvent, Error>` — the canonical LLM event stream used throughout
the native infrastructure

**Usage (Phase 1):**

```typescript
import { streamText } from 'ai'
import { toLLMEvents } from '@doktor/llm-providers/adapters'
import { Stream } from 'effect'

const result = streamText({ model, messages, tools })
const eventStream = toLLMEvents(result)

// Pipe into event bus, SSE endpoint, etc.
Stream.runForEach(eventStream, (event) => emit(event))
```

**Event Mapping:**

| AI SDK Event | LLMEvent |
|---|---|
| `start` | (none) |
| `start-step` | `step-start` |
| `finish-step` | `step-finish` |
| `finish` | `finish` |
| `error` | `provider-error` |
| `text-start` | `text-start` |
| `text-delta` | `text-delta` |
| `text-end` | `text-end` |
| `reasoning-start` | `reasoning-start` |
| `reasoning-delta` | `reasoning-delta` |
| `reasoning-end` | `reasoning-end` |
| `tool-input-start` | `tool-input-start` |
| `tool-input-delta` | `tool-input-delta` |
| `tool-input-end` | `tool-input-end` |
| `tool-call` | `tool-call` |
| `tool-result` | `tool-result` |
| `tool-error` | `tool-error` |
| `abort` / `source` / `file` | (filtered out) |

## Migration Roadmap

```
Phase 0:  from-ai-sdk.ts           ← YOU ARE HERE — adapter exists, unused
Phase 1:  SSE endpoint consumes it ← Event bus + frontend
Phase 2-3: Native protocols replace it ← Direct HTTP, no adapter needed
Phase 4:  Delete this file           ← Cleanup
```
