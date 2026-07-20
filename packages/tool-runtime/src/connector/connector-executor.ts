import { Effect } from 'effect';
import type { ToolExecuteContext, ToolCall } from '../types';

export interface ConnectorExecutorConfig {
  baseUrl: string;
}

export type ToolExecutor = (call: ToolCall, context: ToolExecuteContext) => Effect.Effect<any, Error>;

const CONNECTOR_TOOL_PREFIX = 'connector_';

export function isConnectorTool(toolName: string): boolean {
  return toolName.startsWith(CONNECTOR_TOOL_PREFIX);
}

export function parseConnectorToolName(toolName: string): { provider: string } | null {
  const match = toolName.match(/^connector_([^_]+)$/);
  if (!match) return null;
  return { provider: match[1] };
}

export function createConnectorExecutor(config: ConnectorExecutorConfig): ToolExecutor {
  return (call, _context: ToolExecuteContext) =>
    Effect.gen(function* () {
      const parsed = parseConnectorToolName(call.name);
      if (!parsed) {
        return yield* Effect.fail(new Error(`Invalid connector tool name: ${call.name}`));
      }

      const { provider } = parsed;
      const input = call.input as { action: string; params?: any };
      const action = input.action;

      const url = `${config.baseUrl}/connector/${provider}/${action}`;
      const response = yield* Effect.tryPromise({
        try: () => fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input.params ?? {}),
        }),
        catch: (err) => new Error(`Connector call failed: ${err}`),
      });

      if (!response.ok) {
        const errorText = yield* Effect.promise(() => response.text());
        return yield* Effect.fail(new Error(`Connector ${provider}/${action} failed: ${errorText}`));
      }

      const result = yield* Effect.promise(() => response.json());
      return result;
    });
}
