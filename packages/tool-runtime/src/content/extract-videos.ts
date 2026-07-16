import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const VideoSchema = Schema.Struct({
  url: Schema.String,
  type: Schema.String,
  provider: Schema.String,
  title: Schema.optional(Schema.String),
  thumbnail: Schema.optional(Schema.String),
  width: Schema.optional(Schema.Number),
  height: Schema.optional(Schema.Number),
  embedURL: Schema.optional(Schema.String),
});

const inputSchema = Schema.Struct({
  url: Schema.String,
});

const outputSchema = Schema.Struct({
  videos: Schema.Array(VideoSchema),
  count: Schema.Number,
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const extractVideosTool = make({
  description: 'Extract all embedded videos from a web page. Detects <video> elements, embedded iframe players (YouTube, Vimeo, Dailymotion, Twitch, TikTok), and direct video file links.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL of the page to extract videos from' },
    },
    required: ['url'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Extracting videos from: ${input.url}`);

      const data = yield* Effect.tryPromise({
        try: () =>
          fetch(`${baseUrl()}/v1/extract/videos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({ url: input.url }),
          }).then(async (r) => {
            if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
            const json = await r.json();
            if (!json.success) throw new Error(`go-crawl extract videos failed: ${json.error}`);
            return json as { videos: any[] };
          }),
        catch: (e) => new Error(`Failed to extract videos: ${e instanceof Error ? e.message : String(e)}`),
      });

      const output = { videos: data.videos || [], count: (data.videos || []).length };

      putToolOutput(context.sessionID, context.toolCallID, 'extract_videos', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'extract_videos', toolCallID: context.toolCallID, url: input.url, count: output.count },
      });

      return output;
    }),
});
