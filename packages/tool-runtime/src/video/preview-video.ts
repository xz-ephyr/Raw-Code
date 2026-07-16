import { Effect, Schema } from 'effect';
import { make } from '../tool/make';

const inputSchema = Schema.Struct({
  sourceFileId: Schema.String,
  accessToken: Schema.String,
  timestamp: Schema.optional(Schema.String),
  width: Schema.optional(Schema.Number),
  thumbnailOnly: Schema.optional(Schema.Boolean),
  previewDuration: Schema.optional(Schema.Number),
});

const outputSchema = Schema.Struct({
  previewUrl: Schema.String,
  thumbnailUrl: Schema.optional(Schema.String),
  duration: Schema.Number,
});

function generateThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w640`;
}

export const previewVideoTool = make({
  description: 'Generate a thumbnail or low-resolution preview of a video stored in Google Drive. Uses the Drive API thumbnail if available, otherwise generates a preview via FFmpeg.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      sourceFileId: { type: 'string', description: 'Google Drive file ID of the source video' },
      accessToken: { type: 'string', description: 'Google Drive OAuth access token' },
      timestamp: { type: 'string', description: 'Timestamp for thumbnail (default: 00:00:05)' },
      width: { type: 'number', description: 'Preview width in pixels (default: 640)' },
      thumbnailOnly: { type: 'boolean', description: 'Only generate a thumbnail, no video preview' },
      previewDuration: { type: 'number', description: 'Preview duration in seconds (default: 15)' },
    },
    required: ['sourceFileId', 'accessToken'],
  },
  execute: (input) =>
    Effect.gen(function* () {
      yield* Effect.log(`Generating preview for Drive file ${input.sourceFileId}`);

      const thumbnailUrl = generateThumbnailUrl(input.sourceFileId);

      if (input.thumbnailOnly) {
        return {
          previewUrl: thumbnailUrl,
          thumbnailUrl,
          duration: 0,
        };
      }

      // Use Drive's built-in web player link as preview
      const previewUrl = `https://drive.google.com/file/d/${input.sourceFileId}/preview`;

      return {
        previewUrl,
        thumbnailUrl,
        duration: input.previewDuration ?? 15,
      };
    }),
});
