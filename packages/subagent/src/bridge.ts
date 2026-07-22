import { Effect, Schema } from 'effect';
import { make, materialize } from '@doktor/tool-runtime';
import type { ToolExecuteContext } from '@doktor/tool-runtime';
import { runSubAgent } from './subagent';
import { runParallel } from './scheduler';
import { compose } from './composer';
import { synthesize } from './synthesizer';
import type { SubAgentRequest } from './types';

function resolveModelFromContext(context: ToolExecuteContext, name?: string): unknown {
  if (!name) return undefined;
  if (context.resolveModel) return context.resolveModel(name);
  return name;
}

const toolResultSchema = Schema.Struct({
  name: Schema.String,
  input: Schema.Unknown,
  output: Schema.Unknown,
  error: Schema.optional(Schema.String),
});

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
  toolResults: Schema.Array(toolResultSchema),
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
      const scope = input.toolScope;
      const mat = materialize({ filterByScope: scope, sessionID: context.sessionID });

      const resolveCredential = context.resolveCredential;
      const abortSignal = context.abortSignal;

      if (input.tasks && input.tasks.length > 0) {
        const requests: readonly SubAgentRequest[] = input.tasks.map((t: string) => ({
          task: t,
          context: input.context,
          model: resolveModelFromContext(context, input.model),
          maxSteps: input.maxSteps,
          toolScope: input.toolScope,
          agentType: input.agentType,
          parentSessionID: context.sessionID,
          resolveCredential,
        }));

        const results = yield* runParallel(requests, mat, abortSignal);
        const summary = synthesize(results);
        const allToolResults = results.flatMap(r => r.toolResults);
        return { result: summary, steps: results.length, mode: 'parallel', toolResults: allToolResults };
      }

      if (!input.task) {
        return { result: 'No task provided', steps: 0, mode: 'single', toolResults: [] };
      }

      const request: SubAgentRequest = {
        task: input.task,
        context: input.context,
        model: resolveModelFromContext(context, input.model),
        maxSteps: input.maxSteps,
        toolScope: input.toolScope,
        agentType: input.agentType,
        parentSessionID: context.sessionID,
        resolveCredential,
      };

      const result = yield* runSubAgent(request, mat, abortSignal);
      return { result: result.output, steps: result.steps, mode: 'single', toolResults: result.toolResults };
    }),
});

const composeInputSchema = Schema.Struct({
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

const composeOutputSchema = Schema.Struct({
  outputs: Schema.Array(Schema.String),
  stepCount: Schema.Number,
});

export const composeRunTool = make({
  description: `Define and execute a multi-step agent pipeline. Each step runs a sub-agent with its own personality and tool scope.
Output from each step is available as {{stepName}} in subsequent step task templates.

Example:
  steps: [
    { name: "research", agentType: "researcher", taskTemplate: "Research {{__initial__}}" },
    { name: "write", agentType: "writer", taskTemplate: "Write an article based on: {{research}}" }
  ]`,
  input: composeInputSchema,
  output: composeOutputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Unique step name for output interpolation' },
            agentType: { type: 'string', description: 'Agent personality (general, explore, writer, researcher, video)' },
            taskTemplate: { type: 'string', description: 'Task description with {{name}} placeholders for previous step outputs' },
            toolScope: { type: 'array', items: { type: 'string' }, description: 'Restrict to specific tools' },
            maxSteps: { type: 'number', description: 'Max steps for this sub-agent' },
          },
          required: ['name', 'agentType', 'taskTemplate'],
        },
      },
      initialContext: { type: 'string', description: 'Initial context available as {{__initial__}}' },
      model: { type: 'string', description: 'Model override for all steps' },
    },
    required: ['steps'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      const mat = materialize({ filterByScope: undefined, sessionID: context.sessionID });
      const abortSignal = context.abortSignal;

      const pipeline = {
        steps: input.steps.map((s: any) => ({
          name: s.name,
          agentType: s.agentType,
          taskTemplate: s.taskTemplate,
          toolScope: s.toolScope,
          maxSteps: s.maxSteps,
        })),
        initialContext: input.initialContext,
        model: resolveModelFromContext(context, input.model),
        parentSessionID: context.sessionID,
      };

      const result = yield* compose(pipeline, mat, abortSignal);
      return { outputs: [...result.outputs], stepCount: result.stepResults.length };
    }),
});
