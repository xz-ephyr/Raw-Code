import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import { serverWebSearch, serverFetchPage } from './search-client';
import type { ToolExecuteContext } from '../types';

const SourceSchema = Schema.Struct({
  title: Schema.String,
  url: Schema.String,
  markdown: Schema.optional(Schema.String),
});

const inputSchema = Schema.Struct({
  query: Schema.String,
  maxSources: Schema.optional(Schema.Number),
});

const outputSchema = Schema.Struct({
  query: Schema.String,
  sources: Schema.Array(SourceSchema),
  totalSources: Schema.Number,
});

export const researchCompileTool = make({
  description: 'Deep research: search the web, then scrape each result for full content. Returns a comprehensive research bundle for the agent to synthesize.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The research query' },
      maxSources: { type: 'number', description: 'Maximum sources to scrape (default: 5, max: 10)' },
    },
    required: ['query'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Research compile: ${input.query}`);

      const maxSources = Math.min(input.maxSources ?? 5, 10);

      // Step 1: Search via server (Tavily/Exa/Firecrawl)
      const searchResults = yield* Effect.tryPromise(() => serverWebSearch(input.query, maxSources));

      // Step 2: For each result, scrape full content via server (Firecrawl)
      const sources: Array<{ title: string; url: string; markdown?: string }> = [];
      for (const sr of searchResults.results.slice(0, maxSources)) {
        try {
          const page = yield* Effect.tryPromise(() => serverFetchPage(sr.url, 'markdown'));
          sources.push({
            title: sr.title || page.title || 'Untitled',
            url: sr.url,
            markdown: page.content || sr.content || undefined,
          });
        } catch (e) {
          yield* Effect.log(`Scrape failed for ${sr.url}: ${String(e)}`);
          if (sr.content) sources.push({ title: sr.title || 'Untitled', url: sr.url, markdown: sr.content });
        }
      }

      const ok = sources.filter((s) => s.markdown && s.markdown.length > 0);
      if (ok.length === 0) throw new Error('Research found sources but could not retrieve their content');

      const output = {
        query: input.query,
        sources,
        totalSources: sources.length,
      };

      putToolOutput(context.sessionID, context.toolCallID, 'research_compile', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'research_compile', toolCallID: context.toolCallID, query: input.query, sourcesCount: sources.length },
      });

      return output;
    }),
});
