import { Effect, Schema } from 'effect'
import { make } from '../tool/make'

const inputSchema = Schema.Struct({
  thought: Schema.String,
})

const outputSchema = Schema.Struct({
  acknowledged: Schema.Literal('Noted.'),
})

export const thinkTool = make({
  description:
    'Use to reason step-by-step before acting, especially before calling ' +
    'another tool or when re-evaluating a result. This does not perform any action.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      thought: {
        type: 'string',
        description: 'Your step-by-step reasoning about what to do and why',
      },
    },
    required: ['thought'],
  },
  execute: (input) =>
    Effect.succeed({ acknowledged: 'Noted.' as const }),
})
