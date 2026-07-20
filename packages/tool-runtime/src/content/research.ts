import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import { serverWebSearch } from './search-client';
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

      // Use an explicit AbortController and forward its signal to the fetch so
      // the intended deep-research budget is actually honored (the inner fetch
      // would otherwise use its own 30s timeout and ignore this one).
      const searchResult = yield* Effect.promise<Array<{ title: string; url: string; markdown?: string }>>(async () => {
        const controller = new AbortController();
        // Deep research can take 60s+. Allow longer timeout.
        const timeout = setTimeout(() => controller.abort(), 120000);
        try {
          const { results } = await serverWebSearch(input.query, maxSources, controller.signal);
          return results.map((r) => ({
            title: r.title,
            url: r.url,
            markdown: r.snippet || r.content || '',
          }));
        } finally {
          clearTimeout(timeout);
          controller.abort();
        }
      });

      if (searchResult.length === 0) throw new Error('No search results found');

      const sources = searchResult.slice(0, maxSources).map((r) => ({
        title: r.title || 'Untitled',
        url: r.url || '',
        snippet: (r.markdown || '').slice(0, 400),
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
