import { Effect, Schema } from 'effect';
import { make, materialize } from '@doktor/tool-runtime';
import type { ToolExecuteContext } from '@doktor/tool-runtime';
import { runSubAgent } from './subagent';
import { runParallel } from './scheduler';
import { synthesize } from './synthesizer';
import type { SubAgentRequest } from './types';

let toolFilter: readonly string[] | undefined;

export function setToolFilter(scope: readonly string[] | undefined): void {
  toolFilter = scope;
}

const inputSchema = Schema.Struct({
  task: Schema.optional(Schema.String),
  tasks: Schema.optional(Schema.Array(Schema.String)),
  context: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  maxSteps: Schema.optional(Schema.Number),
  agentType: Schema.optional(Schema.String),
  toolScope: Schema.optional(Schema.Array(Schema.String)),
});

const outputSchema = Schema.Struct({
  result: Schema.String,
  steps: Schema.Number,
  mode: Schema.String,
});

export const subagentRunTool = make({
  description: `Spawn one or more sub-agents to handle complex multi-step tasks.
Each sub-agent gets its own LLM with full tool access.

Two modes:
1. Single task: set \`task\` to one task description. Spawns one sub-agent.
2. Parallel tasks: set \`tasks\` to an array of task descriptions. Spawns one sub-agent per description in parallel and synthesises results.`,
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Single task description' },
      tasks: { type: 'array', items: { type: 'string' }, description: 'Array of task descriptions for parallel execution' },
      context: { type: 'string', description: 'Additional background information' },
      model: { type: 'string', description: 'Optional model ID override' },
      maxSteps: { type: 'number', description: 'Maximum steps per sub-agent loop' },
      agentType: { type: 'string', description: 'Optional agent type override' },
      toolScope: { type: 'array', items: { type: 'string' }, description: 'Restrict sub-agent to specific tools' },
    },
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      const scope = input.toolScope ?? toolFilter;
      const mat = materialize({ filterByScope: scope });

      if (input.tasks && input.tasks.length > 0) {
        const requests: readonly SubAgentRequest[] = input.tasks.map((t: string) => ({
          task: t,
          context: input.context,
          model: input.model,
          maxSteps: input.maxSteps,
          toolScope: input.toolScope,
          agentType: input.agentType,
          parentSessionID: context.sessionID,
        }));

        const results = yield* runParallel(requests, mat);
        const summary = synthesize(results);
        return { result: summary, steps: results.length, mode: 'parallel' };
      }

      if (!input.task) {
        return { result: 'No task provided', steps: 0, mode: 'single' };
      }

      const request: SubAgentRequest = {
        task: input.task,
        context: input.context,
        model: input.model,
        maxSteps: input.maxSteps,
        toolScope: input.toolScope,
        agentType: input.agentType,
        parentSessionID: context.sessionID,
      };

      const result = yield* runSubAgent(request, mat);
      return { result: result.output, steps: result.steps, mode: 'single' };
    }),
});
