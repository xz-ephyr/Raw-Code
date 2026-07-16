import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { getPlan } from './plan-store';

const inputSchema = Schema.Struct({
  planId: Schema.String,
});

const outputSchema = Schema.Struct({
  planId: Schema.String,
  status: Schema.String,
  stepsExecuted: Schema.Number,
  results: Schema.Array(Schema.String),
});

export const executePlanTool = make({
  description: 'Execute a previously approved plan. Provide the planId returned from create_plan. Each step is executed in order.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      planId: { type: 'string', description: 'The plan ID returned from create_plan' },
    },
    required: ['planId'],
  },
  execute: (input) =>
    Effect.gen(function* () {
      const plan = getPlan(input.planId);
      if (!plan) {
        return { planId: input.planId, status: 'not_found', stepsExecuted: 0, results: [] };
      }

      if (plan.status !== 'approved') {
        return { planId: input.planId, status: `not_approved (${plan.status})`, stepsExecuted: 0, results: [] };
      }

      const stepsToExecute = plan.modifiedSteps ?? plan.steps;
      const results: string[] = [];

      for (const step of stepsToExecute) {
        yield* Effect.log(`Executing plan step: ${step.description}`);
        results.push(`Step "${step.description}" marked for execution`);
      }

      return {
        planId: input.planId,
        status: 'completed',
        stepsExecuted: stepsToExecute.length,
        results,
      };
    }),
});
