import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const ImageSchema = Schema.Struct({
  src: Schema.String,
  alt: Schema.optional(Schema.String),
  width: Schema.optional(Schema.Number),
  height: Schema.optional(Schema.Number),
});

const inputSchema = Schema.Struct({
  url: Schema.String,
});

const outputSchema = Schema.Struct({
  images: Schema.Array(ImageSchema),
  count: Schema.Number,
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const extractImagesTool = make({
  description: 'Extract all image URLs with their alt text and dimensions from a web page.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL of the page to extract images from' },
    },
    required: ['url'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Extracting images from: ${input.url}`);

      const data = yield* Effect.promise(() =>
        fetch(`${baseUrl()}/v1/extract/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ url: input.url }),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
            const json = await r.json();
            if (!json.success) throw new Error(`go-crawl extract images failed: ${json.error}`);
            return json as { images: Array<{ src: string; alt?: string; width?: number; height?: number }> };
          })
          .catch((e) => {
            console.warn(`go-crawl extract images failed: ${e instanceof Error ? e.message : String(e)}`);
            throw e;
          }),
      );

      const output = {
        images: (data.images || []).map((img) => ({
          src: img.src,
          alt: img.alt || undefined,
          width: img.width || undefined,
          height: img.height || undefined,
        })),
        count: data.images?.length ?? 0,
      };

      putToolOutput(context.sessionID, context.toolCallID, 'extract_images', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'extract_images', toolCallID: context.toolCallID, url: input.url, count: output.count },
      });

      return output;
    }),
});
