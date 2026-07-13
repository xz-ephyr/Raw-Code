import { Effect, Deferred } from 'effect';
import { Schema } from 'effect';
import { make } from '../tool/make';
import { registerDeferred } from '../deferred';
import { emit } from '../events';
import { putToolOutput } from '../store';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  question: Schema.String,
  options: Schema.optional(Schema.Array(Schema.String)),
  allowCustom: Schema.optional(Schema.Boolean),
});

const outputSchema = Schema.Struct({
  answer: Schema.String,
});

export const questionTool = make({
  description: 'Ask the user a question during execution. Execution pauses until the user replies.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question to ask the user' },
      options: { type: 'array', items: { type: 'string' }, description: 'Predefined answer options' },
      allowCustom: { type: 'boolean', description: 'Allow custom free-text answers beyond the options' },
    },
    required: ['question'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Asking user: ${input.question}`);

      const deferred = yield* Deferred.make<string, Error>();
      registerDeferred(context.sessionID, context.toolCallID, deferred);

      emit({
        type: 'question_pending',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: {
          toolCallID: context.toolCallID,
          question: input.question,
          options: input.options ?? null,
          allowCustom: input.allowCustom ?? true,
        },
      });

      const answer = yield* Deferred.await(deferred);


      emit({
        type: 'question_answered',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolCallID: context.toolCallID, answer },
      });

      const output = { answer };
      putToolOutput(context.sessionID, context.toolCallID, 'question', input, output);
      return output;
    }),
});
