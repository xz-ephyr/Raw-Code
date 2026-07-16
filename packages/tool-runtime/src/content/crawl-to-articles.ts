import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const ArticleSourceSchema = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  markdown: Schema.String,
  suggestedTopic: Schema.String,
});

const inputSchema = Schema.Struct({
  url: Schema.String,
  maxPages: Schema.optional(Schema.Number),
  maxDepth: Schema.optional(Schema.Number),
  urls: Schema.optional(Schema.Array(Schema.String)),
});

const outputSchema = Schema.Struct({
  sources: Schema.Array(ArticleSourceSchema),
  count: Schema.Number,
  instruction: Schema.String,
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const crawlToArticlesTool = make({
  description: 'Crawl a website (or scrape specific URLs) and prepare each page as content for article generation. Returns each page with markdown content and a suggested topic that can be fed into write_article.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The website URL to crawl' },
      maxPages: { type: 'number', description: 'Maximum pages to crawl (default: 10)' },
      maxDepth: { type: 'number', description: 'Maximum link depth (default: 1)' },
      urls: { type: 'array', items: { type: 'string' }, description: 'Specific URLs to scrape instead of crawling (overrides url)' },
    },
    oneOf: [
      { required: ['url'] },
      { required: ['urls'] },
    ],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      const pages: Array<{ url: string; title: string; markdown: string }> = [];

      if (input.urls && input.urls.length > 0) {
        // Scrape specific URLs
        for (const pageUrl of input.urls) {
          yield* Effect.log(`Scraping: ${pageUrl}`);
          const data = yield* Effect.promise(() =>
            fetch(`${baseUrl()}/v1/scrape`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(30000),
              body: JSON.stringify({ url: pageUrl, formats: ['markdown'], onlyMainContent: true }),
            })
              .then(async (r) => {
                if (!r.ok) return null;
                const json = await r.json();
                return json.success ? json.data : null;
              })
              .catch(() => null),
          );
          if (data && data.markdown) {
            pages.push({
              url: pageUrl,
              title: data.metadata?.title || pageUrl,
              markdown: data.markdown,
            });
          }
        }
      } else if (input.url) {
        // Crawl the site
        yield* Effect.log(`Crawling: ${input.url}`);
        const maxPages = input.maxPages ?? 10;
        const maxDepth = input.maxDepth ?? 1;

        const init = yield* Effect.promise(() =>
          fetch(`${baseUrl()}/v1/crawl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({ url: input.url, maxDepth, maxPages }),
          }).then(async (r) => {
            if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
            const json = await r.json();
            if (!json.success) throw new Error(`go-crawl crawl failed: ${json.error}`);
            return json as { id: string };
          }),
        );

        const jobId = init.id;
        const startedAt = Date.now();
        const timeout = 300_000;

        // Poll until completed
        let result: any;
        while (true) {
          if (Date.now() - startedAt > timeout) {
            throw new Error('Crawl timed out');
          }
          const status = yield* Effect.promise(() =>
            fetch(`${baseUrl()}/v1/crawl/${encodeURIComponent(jobId)}`, {
              signal: AbortSignal.timeout(10000),
            }).then(async (r) => {
              if (!r.ok) return null;
              const json = await r.json();
              return json.success ? json : null;
            }).catch(() => null),
          );

          if (status && (status.status === 'completed' || status.status === 'failed')) {
            result = status;
            break;
          }
          // Politeness delay: increase to 5s to avoid hitting rate limits
          yield* Effect.sleep(5000);
        }

        if (result.pages) {
          for (const page of result.pages) {
            if (page.markdown) {
              pages.push({
                url: page.metadata?.sourceURL || '',
                title: page.metadata?.title || 'Untitled',
                markdown: page.markdown,
              });
            }
          }
        }
      }

      // Build output with suggested topics
      const sources = pages.map((p) => ({
        url: p.url,
        title: p.title,
        markdown: p.markdown,
        suggestedTopic: p.title,
      }));

      const output = {
        sources,
        count: sources.length,
        instruction: `Found ${sources.length} pages. To generate articles from each, call write_article for each source using the suggestedTopic.`,
      };

      putToolOutput(context.sessionID, context.toolCallID, 'crawl_to_articles', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'crawl_to_articles', toolCallID: context.toolCallID, url: input.url, pagesCount: sources.length },
      });

      return output;
    }),
});
