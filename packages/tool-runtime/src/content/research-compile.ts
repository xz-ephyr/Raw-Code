import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const SourceSchema = Schema.Struct({
  title: Schema.String,
  url: Schema.String,
  markdown: Schema.optional(Schema.String),
  keyPoints: Schema.optional(Schema.Array(Schema.String)),
});

const inputSchema = Schema.Struct({
  query: Schema.String,
  maxSources: Schema.optional(Schema.Number),
  extractStructure: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
});

const outputSchema = Schema.Struct({
  query: Schema.String,
  sources: Schema.Array(SourceSchema),
  totalSources: Schema.Number,
  extractStructure: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) })),
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const researchCompileTool = make({
  description: 'Deep research: search the web, scrape each result for full content, and optionally extract structured data from each page. Returns a comprehensive research bundle for the agent to synthesize.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The research query' },
      maxSources: { type: 'number', description: 'Maximum sources to scrape (default: 5, max: 10)' },
      extractStructure: { type: 'object', description: 'Optional CSS selectors to extract from each page, e.g. {"headings": "h2"}', additionalProperties: { type: 'string' } },
    },
    required: ['query'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Research compile: ${input.query}`);

      const maxSources = Math.min(input.maxSources ?? 5, 10);

      // Step 1: Search
      const searchResults = yield* Effect.promise(() =>
        fetch(`${baseUrl()}/v1/search?query=${encodeURIComponent(input.query)}&maxResults=${maxSources}`, {
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

      // Step 2: For each result, scrape full content
      const sources: Array<{ title: string; url: string; markdown?: string; keyPoints?: string[] }> = [];
      for (const sr of searchResults.slice(0, maxSources)) {
        const fullContent = yield* Effect.promise(() =>
          fetch(`${baseUrl()}/v1/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({ url: sr.url, formats: ['markdown'], onlyMainContent: true }),
          })
            .then(async (r) => {
              if (!r.ok) return null;
              const json = await r.json();
              return json.success ? json.data : null;
            })
            .catch(() => null),
        );

        sources.push({
          title: sr.title,
          url: sr.url,
          markdown: fullContent?.markdown || sr.markdown || undefined,
        });
      }

      // Step 3: Optional structured extraction
      let structuredData: Record<string, string[]> | undefined;
      if (input.extractStructure && sources.length > 0) {
        const allData: Record<string, string[]> = {};
        for (const field of Object.keys(input.extractStructure)) {
          allData[field] = [];
        }

        for (const source of sources) {
          const pageData = yield* Effect.promise(() =>
            fetch(`${baseUrl()}/v1/extract`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(15000),
              body: JSON.stringify({ url: source.url, selectors: input.extractStructure }),
            })
              .then(async (r) => {
                if (!r.ok) return null;
                const json = await r.json();
                return json.success ? json.data : null;
              })
              .catch(() => null),
          );

          if (pageData) {
            for (const [field, values] of Object.entries(pageData as Record<string, string[]>)) {
              allData[field] = [...(allData[field] || []), ...values];
            }
          }
        }

        structuredData = allData;
      }

      const output = {
        query: input.query,
        sources,
        totalSources: sources.length,
        extractStructure: structuredData,
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
