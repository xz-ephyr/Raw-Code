import { Effect, Schema } from 'effect';
import type { AnyTool } from '../tool/make';
import type { ToolExecuteContext } from '../types';
import { registerSession } from '../registry/session';
import { make } from '../tool/make';

export interface ConnectorActionDef {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

export interface ConnectorToolConfig {
  sessionID: string;
  provider: string;
  baseUrl: string;
}

function jsonSchemaToEffectSchema(schema: any): Schema.Schema<any> {
  if (!schema || !schema.type) return Schema.Any;
  switch (schema.type) {
    case 'string': return Schema.String;
    case 'number': return Schema.Number;
    case 'boolean': return Schema.Boolean;
    case 'array': {
      const itemSchema = schema.items ? jsonSchemaToEffectSchema(schema.items) : Schema.Any;
      return Schema.Array(itemSchema);
    }
    case 'object': {
      const shape: Record<string, Schema.Schema<any, any, never>> = {};
      if (schema.properties) {
        for (const [key, propDef] of Object.entries(schema.properties) as [string, any][]) {
          shape[key] = jsonSchemaToEffectSchema(propDef);
        }
      }
      return Schema.Struct(shape) as unknown as Schema.Schema<any>;
    }
    default: return Schema.Any;
  }
}

function makeConnectorActionTool(
  provider: string,
  action: ConnectorActionDef,
  config: ConnectorToolConfig,
): AnyTool {
  return make({
    description: `${provider}: ${action.description}`,
    input: jsonSchemaToEffectSchema(action.inputSchema),
    output: jsonSchemaToEffectSchema(action.outputSchema),
    inputJsonSchema: action.inputSchema,
    execute: (input, _context: ToolExecuteContext) =>
      Effect.gen(function* () {
        const url = `${config.baseUrl}/connector/${provider}/${action.name}`;
        const response = yield* Effect.tryPromise({
          try: () => fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }),
          catch: (err) => new Error(`Connector call failed: ${err}`),
        });

        if (!response.ok) {
          const errorText = yield* Effect.promise(() => response.text());
          return yield* Effect.fail(new Error(`Connector ${provider}/${action.name} failed: ${errorText}`));
        }

        const result = yield* Effect.promise(() => response.json());
        return result;
      }),
  });
}

export async function initializeConnectorTools(config: ConnectorToolConfig): Promise<void> {
  const schemaUrl = `${config.baseUrl}/connector/${config.provider}/schema`;
  const response = await fetch(schemaUrl, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to fetch schema for ${config.provider}: ${response.statusText}`);
  }
  const data = await response.json() as { provider: string; actions: ConnectorActionDef[] };
  for (const action of data.actions) {
    const tool = makeConnectorActionTool(config.provider, action, config);
    registerSession(config.sessionID, `connector_${config.provider}_${action.name}`, tool, 'connector');
  }
}

export function clearConnectorTools(_sessionID: string): void {
  // Session tools are cleared via clearSessionTools(sessionID) from session registry
}
