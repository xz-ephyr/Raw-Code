import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import { serverFetchPage } from './search-client';
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

      const extractAs = input.formats?.includes('text') ? 'text' : 'markdown';

      const page = yield* Effect.tryPromise(() => serverFetchPage(input.url, extractAs)).pipe(
        Effect.catchAll((e) => {
          console.warn(`scrape failed: ${e instanceof Error ? e.message : String(e)}`);
          return Effect.succeed({ content: '', title: '', url: input.url });
        }),
      );

      const output = {
        markdown: extractAs === 'markdown' ? page.content || undefined : undefined,
        html: extractAs === 'text' ? page.content || undefined : undefined,
        metadata: {
          title: page.title || undefined,
          sourceURL: page.url || input.url,
        },
        links: undefined,
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
