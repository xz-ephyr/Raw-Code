import { Effect, Schema } from 'effect';
import { runSubAgent } from './subagent';
import { getPersonality } from './personalities';
import type { SubAgentRequest, SubAgentResult } from './types';
import type { Materialization } from '@doktor/tool-runtime';

export interface PipelineStep {
  readonly name: string;
  readonly agentType: string;
  readonly systemPromptOverride?: string;
  readonly taskTemplate: string;
  readonly toolScope?: readonly string[];
  readonly maxSteps?: number;
}

export interface PipelineDefinition {
  readonly steps: readonly PipelineStep[];
  readonly initialContext?: string;
  readonly model?: unknown;
}

export interface PipelineResult {
  readonly outputs: readonly string[];
  readonly stepResults: readonly SubAgentResult[];
}

function interpolate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '');
}

export function compose(
  pipeline: PipelineDefinition,
  materialization: Materialization,
  abortSignal?: AbortSignal,
): Effect.Effect<PipelineResult, Error> {
  return Effect.gen(function* () {
    const accumulatedContext: Record<string, string> = {};
    if (pipeline.initialContext) {
      accumulatedContext.__initial__ = pipeline.initialContext;
    }

    const stepResults: SubAgentResult[] = [];

    for (const step of pipeline.steps) {
      const personality = getPersonality(step.agentType) ?? { defaultMaxSteps: 10, toolScope: undefined } as any;
      const task = interpolate(step.taskTemplate, accumulatedContext);

      const req: SubAgentRequest = {
        task,
        context: accumulatedContext.__initial__,
        model: pipeline.model,
        maxSteps: step.maxSteps ?? personality.defaultMaxSteps,
        toolScope: step.toolScope ?? personality.toolScope,
        agentType: step.agentType,
        parentSessionID: '',
      };

      const result = yield* Effect.catchAll(
        runSubAgent(req, materialization, abortSignal),
        (err) =>
          Effect.succeed({
            output: `[Step ${step.name} failed: ${err.message}]`,
            toolCalls: 0,
            steps: 0,
            usage: { inputTokens: 0, outputTokens: 0 },
            toolResults: [],
          } satisfies SubAgentResult),
      );

      accumulatedContext[step.name] = result.output;
      stepResults.push(result);
    }

    return {
      outputs: stepResults.map(r => r.output),
      stepResults,
    };
  });
}

const pipelineSchema = Schema.Struct({
  steps: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      agentType: Schema.String,
      taskTemplate: Schema.String,
      toolScope: Schema.optional(Schema.Array(Schema.String)),
      maxSteps: Schema.optional(Schema.Number),
    }),
  ),
  initialContext: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
});

export const composeInputSchema = pipelineSchema;

export type ComposeInput = Schema.Schema.Type<typeof composeInputSchema>;
