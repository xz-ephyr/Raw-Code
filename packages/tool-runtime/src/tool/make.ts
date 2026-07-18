import { Effect, Schema } from 'effect';
import type { ToolExecuteContext, Content, MaterializedTool } from '../types';
import { setRuntime, getRuntime } from './settle';

export interface ToolConfig<I, O = I, S = O> {
  readonly description: string;
  readonly input: Schema.Schema<I, any, never>;
  readonly output: Schema.Schema<O, any, never>;
  readonly inputJsonSchema?: Record<string, any>;
  readonly structured?: Schema.Schema<S, any, never>;
  readonly toStructuredOutput?: (input: { input: I; output: O }) => S;
  readonly execute: (input: I, context: ToolExecuteContext) => Effect.Effect<O, Error>;
  readonly toModelOutput?: (input: { input: I; output: O }) => readonly Content[];
}

export interface ToolDefinition<I, S> {
  readonly _Input: I;
  readonly _Structured: S;
}

export type AnyTool = ToolDefinition<any, any>;

export function make<I, O = I, S = O>(config: ToolConfig<I, O, S>): ToolDefinition<I, S> {
  const tool = {} as ToolDefinition<I, S>;

  const runtime = {
    description: config.description,
    inputSchema: config.input,
    inputJsonSchema: config.inputJsonSchema,
    outputSchema: config.output,
    execute: config.execute,
    structured: config.structured,
    toStructuredOutput: config.toStructuredOutput,
    toModelOutput: config.toModelOutput,
    permission: undefined as readonly { action: string; resource: string; effect: 'allow' | 'deny' }[] | undefined,
  };

  setRuntime(tool, runtime);
  return tool;
}

export function getToolRuntime(tool: AnyTool): ToolRuntime | undefined {
  return getRuntime(tool);
}

export interface ToolRuntime {
  readonly description: string;
  readonly inputSchema: Schema.Schema<any, any, never>;
  readonly inputJsonSchema?: Record<string, any>;
  readonly outputSchema: Schema.Schema<any, any, never>;
  readonly execute: (input: any, context: ToolExecuteContext) => Effect.Effect<any, Error>;
  readonly structured?: Schema.Schema<any, any, never>;
  readonly toStructuredOutput?: (input: { input: any; output: any }) => any;
  readonly toModelOutput?: (input: { input: any; output: any }) => readonly Content[];
  readonly permission?: readonly { action: string; resource: string; effect: 'allow' | 'deny' }[];
}

export function toMaterializedTool(name: string, tool: AnyTool): MaterializedTool {
  const runtime = getToolRuntime(tool);
  if (!runtime) {
    throw new Error(`Tool "${name}" has no runtime attached`);
  }

  const inputSchema = runtime.inputJsonSchema ?? {
    type: 'object',
    properties: {},
    description: runtime.description,
  };

  return {
    name,
    description: runtime.description,
    inputSchema,
    settle: async (call, context) => {
      try {
        const decoded = await Effect.runPromise(
          Schema.decodeUnknown(runtime.inputSchema)(call.input)
        );
        const output = await Effect.runPromise(
          runtime.execute(decoded, context)
        );
        return { type: 'success', value: output };
      } catch (err) {
        return {
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
          error: err,
        };
      }
    },
  };
}
