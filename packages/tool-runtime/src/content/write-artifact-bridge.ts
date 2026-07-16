import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const ArtifactType = Schema.Literal(
  'markdown', 'doc', 'pptx', 'excel', 'pdf',
  'code', 'html', 'react', 'svg', 'mermaid',
);

const inputSchema = Schema.Struct({
  identifier: Schema.String,
  type: ArtifactType,
  title: Schema.String,
  content: Schema.String,
  language: Schema.optional(Schema.String),
  idempotencyKey: Schema.optional(Schema.String),
});

const outputSchema = Schema.Struct({
  identifier: Schema.String,
  type: Schema.String,
  title: Schema.String,
  content: Schema.String,
  language: Schema.optional(Schema.String),
});

export const writeArtifactBridgeTool = make({
  description: 'Create or update a document artifact: markdown, Word doc, PowerPoint, Excel, PDF, code, HTML, or diagram. Use for substantial content (>15 lines). Reuse the same identifier to update an existing artifact. One artifact per message unless asked otherwise.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      identifier: { type: 'string', description: 'Unique kebab-case identifier for the artifact. Reuse to update an existing artifact.' },
      type: { type: 'string', enum: ['markdown', 'doc', 'pptx', 'excel', 'pdf', 'code', 'html', 'react', 'svg', 'mermaid'], description: 'The type of artifact.' },
      title: { type: 'string', description: 'Human-readable title for the artifact.' },
      content: { type: 'string', description: 'The full content of the artifact.' },
      language: { type: 'string', description: 'Programming language (for code artifacts).' },
      idempotencyKey: { type: 'string', description: 'Idempotency key to prevent duplicate creation.' },
    },
    required: ['identifier', 'type', 'title', 'content'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Artifact created: ${input.identifier} (${input.type})`);

      const output = {
        identifier: input.identifier,
        type: input.type,
        title: input.title,
        content: input.content,
        language: input.language,
      };

      putToolOutput(context.sessionID, context.toolCallID, 'write_artifact', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'write_artifact', toolCallID: context.toolCallID, identifier: input.identifier },
      });

      return output;
    }),
});
