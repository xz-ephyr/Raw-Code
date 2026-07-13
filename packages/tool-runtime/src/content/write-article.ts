import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  topic: Schema.String,
  audience: Schema.optional(Schema.String),
  tone: Schema.optional(Schema.String),
  wordCount: Schema.optional(Schema.Number),
  keywords: Schema.optional(Schema.Array(Schema.String)),
  idempotencyKey: Schema.optional(Schema.String),
});

const outputSchema = Schema.Struct({
  articleId: Schema.String,
  title: Schema.String,
  content: Schema.String,
  wordCount: Schema.Number,
  version: Schema.Number,
});

export const writeArticleTool = make({
  description: 'Write a long-form article on a given topic with specified tone, audience, and word count.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'The topic to write about' },
      audience: { type: 'string', description: 'Target audience for the article' },
      tone: { type: 'string', description: 'Writing tone (e.g. professional, casual, persuasive)' },
      wordCount: { type: 'number', description: 'Target word count' },
      keywords: { type: 'array', items: { type: 'string' }, description: 'SEO keywords to include' },
      idempotencyKey: { type: 'string', description: 'Idempotency key to prevent duplicate generation' },
    },
    required: ['topic'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Writing article on topic: ${input.topic}`);

      const articleId = crypto.randomUUID();
      const title = `${input.tone ?? 'Informative'} Article on ${input.topic}`;
      const wordCount = input.wordCount ?? 800;
      const content =
        `# ${title}\n\n` +
        `**Audience:** ${input.audience ?? 'General'}\n` +
        `**Tone:** ${input.tone ?? 'Neutral'}\n` +
        `**Keywords:** ${(input.keywords ?? []).join(', ') || 'None'}\n\n` +
        `This is a ${wordCount}-word article about ${input.topic}. `.repeat(5).trim() +
        `\n\n[Full article content would be generated here in production.]`;

      const output = { articleId, title, content, wordCount, version: 1 };

      putToolOutput(context.sessionID, context.toolCallID, 'write_article', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'write_article', toolCallID: context.toolCallID, articleId },
      });

      return output;
    }),
});
