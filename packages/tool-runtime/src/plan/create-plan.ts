import { Effect, Deferred } from 'effect';
import { Schema } from 'effect';
import { make } from '../tool/make';
import { registerDeferred } from '../deferred';
import { emit } from '../events';
import { createPlan, updatePlanStatus } from './plan-store';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  title: Schema.String,
  steps: Schema.Array(
    Schema.Struct({
      description: Schema.String,
      toolName: Schema.optional(Schema.String),
      expectedInput: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    }),
  ),
});

export const createPlanTool = make({
  description: `Create a multi-step plan and present it to the user for approval.
Call this tool to propose a sequence of actions before executing them.
The user can approve, modify, or reject the plan.
After calling this tool, use the returned planId with execute_plan once approved.`,
  input: inputSchema,
  output: Schema.Struct({
    planId: Schema.String,
    status: Schema.String,
    stepCount: Schema.Number,
  }),
  inputJsonSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short title for the plan' },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Description of this step' },
            toolName: { type: 'string', description: 'Expected tool to use for this step' },
            expectedInput: { type: 'object', description: 'Expected input parameters' },
          },
          required: ['description'],
        },
      },
    },
    required: ['title', 'steps'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      const planId = crypto.randomUUID();
      const steps = input.steps.map((s: any, i: number) => ({
        id: `step-${i + 1}`,
        description: s.description,
        toolName: s.toolName,
        expectedInput: s.expectedInput,
      }));

      createPlan({ planId, title: input.title, steps, status: 'pending', sessionID: context.sessionID });

      const deferred = yield* Deferred.make<string, Error>();
      registerDeferred(context.sessionID, context.toolCallID, deferred);

      emit({
        type: 'question_pending',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: {
          kind: 'plan_approval',
          planId,
          title: input.title,
          steps,
          toolCallID: context.toolCallID,
        },
      });

      const answer = yield* Deferred.await(deferred);

      const approved = answer === 'approved' || answer === 'yes';
      updatePlanStatus(planId, approved ? 'approved' : 'rejected');

      emit({
        type: 'question_answered',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { kind: 'plan_approval', planId, approved, answer },
      });

      return { planId, status: approved ? 'approved' : 'rejected', stepCount: steps.length };
    }),
});
