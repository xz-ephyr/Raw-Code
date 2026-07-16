import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import { withCrawlCache, buildCacheKey } from './with-crawl-cache';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  url: Schema.String,
  onlyMainContent: Schema.optional(Schema.Boolean),
  formats: Schema.optional(Schema.Array(Schema.String)),
});

const outputSchema = Schema.Struct({
  markdown: Schema.optional(Schema.String),
  html: Schema.optional(Schema.String),
  metadata: Schema.Struct({
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    sourceURL: Schema.String,
    statusCode: Schema.optional(Schema.Number),
    contentType: Schema.optional(Schema.String),
  }),
  links: Schema.optional(Schema.Array(Schema.String)),
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const scrapeUrlTool = make({
  description: 'Scrape a single web page and return its content as markdown or HTML, along with metadata and links.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to scrape' },
      onlyMainContent: { type: 'boolean', description: 'If true, extract only the main content (excludes nav, footer, ads)' },
      formats: { type: 'array', items: { type: 'string', enum: ['markdown', 'html'] }, description: 'Output formats (default: ["markdown"])' },
    },
    required: ['url'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Scraping URL: ${input.url}`);

      const formats = input.formats ?? ['markdown'];
      const cacheKey = buildCacheKey('scrape', input.url, input.onlyMainContent, formats.join(','));

      const data: any = yield* withCrawlCache({
        cacheKey,
        ttlSeconds: 3600,
        fetch: () =>
          fetch(`${baseUrl()}/v1/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({ url: input.url, formats, onlyMainContent: input.onlyMainContent }),
          })
            .then(async (r) => {
              if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
              const json = await r.json();
              if (!json.success) throw new Error(`go-crawl scrape failed: ${json.error}`);
              return json.data;
            })
            .catch((e) => {
              console.warn(`go-crawl scrape failed: ${e instanceof Error ? e.message : String(e)}`);
              throw e;
            }),
      });

      const output = {
        markdown: data.markdown || undefined,
        html: data.html || undefined,
        metadata: {
          title: data.metadata?.title || undefined,
          description: data.metadata?.description || undefined,
          sourceURL: data.metadata?.sourceURL || input.url,
          statusCode: data.metadata?.statusCode || undefined,
          contentType: data.metadata?.contentType || undefined,
        },
        links: data.links || undefined,
      };

      putToolOutput(context.sessionID, context.toolCallID, 'scrape_url', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'scrape_url', toolCallID: context.toolCallID, url: input.url },
      });

      return output;
    }),
});
