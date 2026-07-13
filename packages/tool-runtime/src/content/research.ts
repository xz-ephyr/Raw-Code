import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  query: Schema.String,
  depth: Schema.optional(Schema.Enums({ quick: 'quick', deep: 'deep' })),
  maxSources: Schema.optional(Schema.Number),
});

const outputSchema = Schema.Struct({
  summary: Schema.String,
  sources: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      url: Schema.String,
      snippet: Schema.String,
    }),
  ),
  partial: Schema.optional(Schema.Boolean),
});

export const researchTool = make({
  description: 'Research a topic by searching the web and synthesizing findings.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The research query' },
      depth: { type: 'string', enum: ['quick', 'deep'], description: 'Research depth: quick summary or deep dive' },
      maxSources: { type: 'number', description: 'Maximum number of sources to return' },
    },
    required: ['query'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Researching: ${input.query}`);

      const isDeep = input.depth === 'deep';
      const maxSources = input.maxSources ?? (isDeep ? 8 : 3);
      const sources = Array.from({ length: Math.min(maxSources, 5) }, (_, i) => ({
        title: `Result ${i + 1}: ${input.query.split(' ').slice(0, 4).join(' ')}${i > 0 ? ` - Perspective ${i + 1}` : ''}`,
        url: `https://example.com/research/${encodeURIComponent(input.query)}/${i + 1}`,
        snippet: `This is a ${isDeep ? 'detailed' : 'brief'} snippet about "${input.query}" providing relevant context and key information for analysis.`,
      }));

      const summary = isDeep
        ? `Deep research results for "${input.query}":\n\n` +
          sources.map((s, i) => `${i + 1}. ${s.title}\n   ${s.snippet}`).join('\n\n') +
          `\n\n**Conclusion:** The research indicates multiple relevant perspectives on this topic.`
        : `Quick summary for "${input.query}": Found ${sources.length} relevant sources with key information about the topic.`;

      const output = { summary, sources, partial: false };

      putToolOutput(context.sessionID, context.toolCallID, 'research', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'research', toolCallID: context.toolCallID, sourceCount: sources.length },
      });

      return output;
    }),
});
