import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  text: Schema.String,
  instructions: Schema.String,
  version: Schema.optional(Schema.Number),
  idempotencyKey: Schema.optional(Schema.String),
});

const outputSchema = Schema.Struct({
  text: Schema.String,
  changes: Schema.Array(
    Schema.Struct({
      type: Schema.String,
      original: Schema.String,
      replacement: Schema.String,
    }),
  ),
  version: Schema.Number,
});

function applyEdit(text: string, instruction: string): { text: string; changes: Array<{ type: string; original: string; replacement: string }> } {
  const lower = instruction.toLowerCase();
  const changes: Array<{ type: string; original: string; replacement: string }> = [];

  if (lower.includes('concise') || lower.includes('shorter') || lower.includes('shorten')) {
    const trimmed = text.length > 500 ? text.slice(0, 500) + '...' : text;
    changes.push({ type: 'trim', original: text, replacement: trimmed });
    return { text: trimmed, changes };
  }

  if (lower.includes('formal') || lower.includes('professional')) {
    const replacement = text
      .replace(/\bgonna\b/gi, 'going to')
      .replace(/\bgotta\b/gi, 'got to')
      .replace(/\bwanna\b/gi, 'want to')
      .replace(/\.\.\./g, '—');
    changes.push({ type: 'formalize', original: text, replacement });
    return { text: replacement, changes };
  }

  if (lower.includes('casual') || lower.includes('friendly')) {
    const replacement = text
      .replace(/\bhowever\b/gi, 'but')
      .replace(/\btherefore\b/gi, 'so')
      .replace(/\badditionally\b/gi, 'also');
    changes.push({ type: 'casual', original: text, replacement });
    return { text: replacement, changes };
  }

  changes.push({ type: 'unchanged', original: text, replacement: text });
  return { text, changes };
}

export const editTextTool = make({
  description: 'Edit, proofread, or transform existing text according to instructions.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text to edit' },
      instructions: { type: 'string', description: 'Editing instructions (e.g. make it more concise, change tone to formal)' },
      version: { type: 'number', description: 'Current version number for tracking' },
      idempotencyKey: { type: 'string', description: 'Idempotency key to prevent duplicate edits' },
    },
    required: ['text', 'instructions'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Editing text with instructions: ${input.instructions}`);

      const { text: editedText, changes } = applyEdit(input.text, input.instructions);
      const newVersion = (input.version ?? 0) + 1;
      const output = { text: editedText, changes, version: newVersion };

      putToolOutput(context.sessionID, context.toolCallID, 'edit_text', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'edit_text', toolCallID: context.toolCallID, changeCount: changes.length },
      });

      return output;
    }),
});
