import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  url: Schema.String,
});

const outputSchema = Schema.Struct({
  links: Schema.Array(Schema.String),
  count: Schema.Number,
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const mapSiteTool = make({
  description: 'Discover all internal URLs on a website. Tries sitemap.xml first, falls back to crawling links from the homepage.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The website URL to map' },
    },
    required: ['url'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Mapping site: ${input.url}`);

      const data = yield* Effect.tryPromise({
        try: () =>
          fetch(`${baseUrl()}/v1/map`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({ url: input.url }),
          }).then(async (r) => {
            if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
            const json = await r.json();
            if (!json.success) throw new Error(`go-crawl map failed: ${json.error}`);
            return json as { links: string[] };
          }),
        catch: (e) => new Error(`Failed to map site: ${e instanceof Error ? e.message : String(e)}`),
      });

      const output = { links: data.links || [], count: (data.links || []).length };

      putToolOutput(context.sessionID, context.toolCallID, 'map_site', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'map_site', toolCallID: context.toolCallID, url: input.url, count: output.count },
      });

      return output;
    }),
});
