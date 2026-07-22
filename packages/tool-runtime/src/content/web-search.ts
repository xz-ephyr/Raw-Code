import { Effect, Schema, Duration } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import { serverWebSearch } from './search-client';
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
  answer: Schema.optional(Schema.String),
  partial: Schema.optional(Schema.Boolean),
});

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

      const searchResult = yield* Effect.tryPromise({
        try: () => serverWebSearch(input.query, maxResults),
        catch: (err) => new Error(`Web search failed: ${err instanceof Error ? err.message : String(err)}`),
      }).pipe(
        Effect.timeout(Duration.seconds(35)),
        Effect.catchAll((err) =>
          Effect.gen(function* () {
            yield* Effect.logError("Web search error", err);
            emit({
              type: 'tool_call_end',
              sessionID: context.sessionID,
              agentID: context.agentID,
              timestamp: Date.now(),
              payload: { toolName: 'web_search', toolCallID: context.toolCallID, error: err.message ?? String(err) },
            });
            return yield* Effect.fail(err);
          }),
        ),
      );

      const sources = searchResult.results.slice(0, maxResults).map((r) => ({
        title: r.title || 'Untitled',
        url: r.url || '',
        snippet: (r.snippet || r.content || '').slice(0, 400),
      }));

      const output = { sources, answer: searchResult.answer, partial: false };

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
