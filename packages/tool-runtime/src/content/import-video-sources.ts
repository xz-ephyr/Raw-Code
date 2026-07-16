import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const VideoSourceSchema = Schema.Struct({
  url: Schema.String,
  type: Schema.String,
  provider: Schema.String,
  title: Schema.optional(Schema.String),
  thumbnail: Schema.optional(Schema.String),
  width: Schema.optional(Schema.Number),
  height: Schema.optional(Schema.Number),
  embedURL: Schema.optional(Schema.String),
  downloadable: Schema.Boolean,
});

const inputSchema = Schema.Struct({
  url: Schema.String,
  sourceFileId: Schema.optional(Schema.String),
  accessToken: Schema.optional(Schema.String),
});

const outputSchema = Schema.Struct({
  videos: Schema.Array(VideoSourceSchema),
  count: Schema.Number,
  pipelineReady: Schema.Boolean,
  pipelineHint: Schema.optional(Schema.String),
});

function baseUrl(): string {
  return 'http://localhost:8080';
}

export const importVideoSourcesTool = make({
  description: 'Extract videos from a web page and prepare them for the video editing pipeline. Returns each video with download metadata and a suggested edit_video manifest template. If sourceFileId and accessToken are provided, the video is ready for direct pipeline use.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL of the page to extract videos from' },
      sourceFileId: { type: 'string', description: 'Drive file ID of a video to edit (optional — for pipeline integration)' },
      accessToken: { type: 'string', description: 'Drive access token (required if sourceFileId is provided)' },
    },
    required: ['url'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Importing video sources from: ${input.url}`);

      const data = yield* Effect.promise(() =>
        fetch(`${baseUrl()}/v1/extract/videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ url: input.url }),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error(`go-crawl error (${r.status})`);
            const json = await r.json();
            if (!json.success) throw new Error(`go-crawl extract videos failed: ${json.error}`);
            return json as { videos: Array<{
              url: string; type: string; provider: string;
              title?: string; thumbnail?: string;
              width?: number; height?: number; embedURL?: string;
            }> };
          }),
      );

      const videos = (data.videos || []).map((v) => ({
        url: v.url,
        type: v.type,
        provider: v.provider,
        title: v.title || undefined,
        thumbnail: v.thumbnail || undefined,
        width: v.width || undefined,
        height: v.height || undefined,
        embedURL: v.embedURL || undefined,
        downloadable: v.provider === 'direct' || v.type.startsWith('video/'),
      }));

      const downloadable = videos.filter((v) => v.downloadable);
      const pipelineReady = !!(input.sourceFileId && input.accessToken);

      let pipelineHint: string | undefined;
      if (downloadable.length > 0 && !pipelineReady) {
        pipelineHint = `Found ${downloadable.length} downloadable video(s). Upload to Drive first, then call edit_video with the file ID.`;
      } else if (downloadable.length > 0 && pipelineReady) {
        pipelineHint = `Ready for pipeline. Use edit_video with sourceFileId="${input.sourceFileId}" and the manifest of your choice.`;
      }

      const output = { videos, count: videos.length, pipelineReady, pipelineHint };

      putToolOutput(context.sessionID, context.toolCallID, 'import_video_sources', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'import_video_sources', toolCallID: context.toolCallID, url: input.url, count: output.count },
      });

      return output;
    }),
});
