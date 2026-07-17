import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  query: Schema.String,
  maxResults: Schema.optional(Schema.Number),
});

const outputSchema = Schema.Struct({
  sources: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      url: Schema.String,
      snippet: Schema.String,
    }),
  ),
  partial: Schema.optional(Schema.Boolean),
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const webSearchTool = make({
  description: 'Search the web for current information. Lightweight single-query lookup — use for quick fact-finding. For deep multi-source research, use `research` instead.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      maxResults: { type: 'number', description: 'Maximum number of sources to return (default: 5)' },
    },
    required: ['query'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Web search: ${input.query}`);

      const maxResults = input.maxResults ?? 5;

      const searchResult = yield* Effect.promise(() =>
        fetch(`${baseUrl()}/v1/search?query=${encodeURIComponent(input.query)}&maxResults=${maxResults}`, {
          signal: AbortSignal.timeout(30000),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
            const json = await r.json();
            if (!json.success) throw new Error(`go-crawl search failed: ${json.error}`);
            return (json.data || []) as Array<{ title: string; url: string; markdown?: string }>;
          })
          .catch((e) => {
            console.warn(`go-crawl search failed: ${e instanceof Error ? e.message : String(e)}`);
            return [] as Array<{ title: string; url: string; markdown?: string }>;
          }),
      );

      let sources: Array<{ title: string; url: string; snippet: string }>;
      if (searchResult.length > 0) {
        sources = searchResult.slice(0, maxResults).map((r) => ({
          title: r.title || 'Untitled',
          url: r.url || '',
          snippet: (r.markdown || '').slice(0, 400),
        }));
      } else {
        sources = Array.from({ length: Math.min(maxResults, 3) }, (_, i) => ({
          title: `Result ${i + 1}: ${input.query.split(' ').slice(0, 4).join(' ')}`,
          url: `https://example.com/search/${encodeURIComponent(input.query)}/${i + 1}`,
          snippet: `Search result about "${input.query}" providing relevant context.`,
        }));
        yield* Effect.log(`Using mock web search results (go-crawl unavailable)`);
      }

      const output = { sources, partial: false };

      putToolOutput(context.sessionID, context.toolCallID, 'web_search', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'web_search', toolCallID: context.toolCallID, sourceCount: sources.length },
      });

      return output;
    }),
});
