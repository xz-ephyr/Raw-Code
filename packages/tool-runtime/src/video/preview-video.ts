import { Effect, Schema } from 'effect';
import { make } from '../tool/make';

const inputSchema = Schema.Struct({
  jobId: Schema.String,
  duration: Schema.optional(Schema.Number),
  thumbnailOnly: Schema.optional(Schema.Boolean),
});

const outputSchema = Schema.Struct({
  previewUrl: Schema.String,
  thumbnailUrl: Schema.optional(Schema.String),
  duration: Schema.Number,
});

export const previewVideoTool = make({
  description: 'Generate a low-resolution preview of a video for quick review.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'Job ID of the rendered video' },
      duration: { type: 'number', description: 'Preview duration in seconds' },
      thumbnailOnly: { type: 'boolean', description: 'Generate only a thumbnail, no video preview' },
    },
    required: ['jobId'],
  },
  execute: (input) =>
    Effect.gen(function* () {
      yield* Effect.log(`Generating preview for job ${input.jobId}`);
      return { previewUrl: '', thumbnailUrl: undefined, duration: input.duration ?? 30 };
    }),
});
