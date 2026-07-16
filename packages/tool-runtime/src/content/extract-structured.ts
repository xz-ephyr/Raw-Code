import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  url: Schema.String,
  selectors: Schema.Record({ key: Schema.String, value: Schema.String }),
});

const outputSchema = Schema.Struct({
  data: Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) }),
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const extractStructuredTool = make({
  description: 'Extract structured data from a web page using CSS selectors. Provide named selectors like {"headings": "h2", "prices": ".price"} and get back the text content of matching elements.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to extract data from' },
      selectors: { type: 'object', description: 'Map of field names to CSS selectors, e.g. {"headings": "h2", "links": "a"}', additionalProperties: { type: 'string' } },
    },
    required: ['url', 'selectors'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Extracting structured data from: ${input.url}`);

      const data = yield* Effect.promise(() =>
        fetch(`${baseUrl()}/v1/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ url: input.url, selectors: input.selectors }),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
            const json = await r.json();
            if (!json.success) throw new Error(`go-crawl extract failed: ${json.error}`);
            return json.data as Record<string, string[]>;
          })
          .catch((e) => {
            console.warn(`go-crawl extract structured failed: ${e instanceof Error ? e.message : String(e)}`);
            throw e;
          }),
      );

      const output = { data };

      putToolOutput(context.sessionID, context.toolCallID, 'extract_structured', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'extract_structured', toolCallID: context.toolCallID, url: input.url },
      });

      return output;
    }),
});
