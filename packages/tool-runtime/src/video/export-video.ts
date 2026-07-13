import { Effect, Schema } from 'effect';
import { make } from '../tool/make';

const inputSchema = Schema.Struct({
  jobId: Schema.String,
  destination: Schema.String,
  format: Schema.optional(Schema.Enums({ mp4: 'mp4', mov: 'mov', webm: 'webm' })),
});

const outputSchema = Schema.Struct({
  url: Schema.String,
  size: Schema.Number,
  format: Schema.String,
});

export const exportVideoTool = make({
  description: 'Export a rendered video to a specified destination with format options.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'Job ID of the rendered video' },
      destination: { type: 'string', description: 'Destination path or URL' },
      format: { type: 'string', enum: ['mp4', 'mov', 'webm'], description: 'Export format' },
    },
    required: ['jobId', 'destination'],
  },
  execute: (input) =>
    Effect.gen(function* () {
      yield* Effect.log(`Exporting video job ${input.jobId}`);
      return { url: '', size: 0, format: 'mp4' };
    }),
});
