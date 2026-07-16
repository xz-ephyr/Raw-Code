import { Effect, Schema, Schedule } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

// Retry policy: Exponential backoff starting at 2s, max 3 retries
const retryPolicy = Schedule.exponential(2000).pipe(Schedule.compose(Schedule.recurs(3)));

const inputSchema = Schema.Struct({
  url: Schema.String,
  maxDepth: Schema.optional(Schema.Number),
  maxPages: Schema.optional(Schema.Number),
  pollIntervalMs: Schema.optional(Schema.Number),
  pollTimeoutMs: Schema.optional(Schema.Number),
});

const outputSchema = Schema.Struct({
  jobId: Schema.String,
  status: Schema.String,
  pages: Schema.optional(
    Schema.Array(
      Schema.Struct({
        markdown: Schema.optional(Schema.String),
        metadata: Schema.Struct({
          title: Schema.optional(Schema.String),
          description: Schema.optional(Schema.String),
          sourceURL: Schema.String,
        }),
        links: Schema.optional(Schema.Array(Schema.String)),
      }),
    ),
  ),
  stats: Schema.optional(
    Schema.Struct({
      totalPages: Schema.Number,
      visitedPages: Schema.Number,
      failedPages: Schema.Number,
      depthReached: Schema.Number,
    }),
  ),
  error: Schema.optional(Schema.String),
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const crawlWebsiteTool = make({
  description: 'Crawl a website to extract all pages within the same domain, following links up to a configurable depth and page limit.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to start crawling from' },
      maxDepth: { type: 'number', description: 'Maximum link depth to follow (default: 2, max: 10)' },
      maxPages: { type: 'number', description: 'Maximum pages to crawl (default: 50, max: 500)' },
      pollIntervalMs: { type: 'number', description: 'Poll interval in ms (default: 2000)' },
      pollTimeoutMs: { type: 'number', description: 'Poll timeout in ms (default: 300000)' },
    },
    required: ['url'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Starting crawl: ${input.url}`);

       const interval = input.pollIntervalMs ?? 2000;
       const timeout = input.pollTimeoutMs ?? 300_000;
       const startedAt = Date.now();

       const crawlEffect: Effect.Effect<{ success: boolean; id: string }, Error> = Effect.tryPromise({
         try: () =>
           fetch(`${baseUrl()}/v1/crawl`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             signal: AbortSignal.timeout(10000),
             body: JSON.stringify({
               url: input.url,
               maxDepth: input.maxDepth,
               maxPages: input.maxPages,
             }),
           }).then(async (r) => {
             if (r.status === 429) throw new Error('rate_limit');
             if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
             return r.json() as Promise<{ success: boolean; id: string }>;
           }),
         catch: (e) => new Error(`Crawl init failed: ${String(e)}`),
       });

       const init = yield* Effect.retry(crawlEffect, retryPolicy);

       if (!init.success) throw new Error('go-crawl crawl returned unsuccessful');
       const jobId = init.id;

       const pollOnce = (): Effect.Effect<any, Error> =>
         Effect.tryPromise({
           try: () =>
             fetch(`${baseUrl()}/v1/crawl/${encodeURIComponent(jobId)}`, {
               signal: AbortSignal.timeout(10000),
             }).then(async (r) => {
               if (r.status === 429) throw new Error('rate_limit');
               if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
               return r.json() as Promise<any>;
             }),
           catch: (e) => new Error(`Poll failed for ${jobId}: ${String(e)}`),
         });

       const pollLoop = (): Effect.Effect<any, Error> =>
         Effect.gen(function* () {
           while (true) {
             if (Date.now() - startedAt > timeout) {
               return { status: 'timeout', pages: [], stats: null, error: 'Poll timeout reached' };
             }

             const res = yield* pollOnce();
             if (!res || res.status === 'running' || res.status === 'started') {
               yield* Effect.sleep(interval);
               continue;
             }

             return res;
           }
         });

      const result = yield* pollLoop();

      const output = {
        jobId,
        status: result.status || 'completed',
        pages: (result.pages || []).map((p: any) => ({
          markdown: p.markdown || undefined,
          metadata: {
            title: p.metadata?.title || undefined,
            description: p.metadata?.description || undefined,
            sourceURL: p.metadata?.sourceURL || '',
          },
          links: p.links || undefined,
        })),
        stats: result.stats
          ? {
              totalPages: result.stats.totalPages ?? 0,
              visitedPages: result.stats.visitedPages ?? 0,
              failedPages: result.stats.failedPages ?? 0,
              depthReached: result.stats.depthReached ?? 0,
            }
          : undefined,
        error: result.error || undefined,
      };

      putToolOutput(context.sessionID, context.toolCallID, 'crawl_website', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'crawl_website', toolCallID: context.toolCallID, jobId, pagesCount: output.pages?.length ?? 0 },
      });

      return output;
    }),
});
