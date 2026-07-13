import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import type { Materialization } from './materialize';
import type { PermissionRuleset } from '../tool/withPermission';
import { checkPermission } from '../tool/withPermission';

function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || !schema.type) {
    return z.any();
  }

  switch (schema.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'integer':
      return z.number().int();
    case 'array': {
      const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.any();
      return z.array(itemSchema);
    }
    case 'object': {
      const shape: Record<string, z.ZodTypeAny> = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          shape[key] = jsonSchemaToZod(propSchema);
        }
      }
      return z.object(shape);
    }
    default:
      return z.any();
  }
}

export function toAISDKTools(
  materialization: Materialization,
  permissions?: PermissionRuleset,
  sessionContext?: { sessionID: string; agentID: string; assistantMessageID: string },
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const def of materialization.definitions) {
    if (permissions) {
      if (!checkPermission(def.name, 'use', def.name, permissions)) continue;
    }

    let zodInput: z.ZodTypeAny;
    try {
      zodInput = jsonSchemaToZod(def.inputSchema);
    } catch {
      zodInput = z.object({});
    }

    result[def.name] = tool({
      description: def.description,
      inputSchema: zodSchema(zodInput),
      execute: async (args: any) => {
        const call = {
          id: `call_${Date.now()}`,
          name: def.name,
          input: args,
        };
        const context = {
          sessionID: sessionContext?.sessionID ?? '',
          agentID: sessionContext?.agentID ?? '',
          assistantMessageID: sessionContext?.assistantMessageID ?? '',
          toolCallID: call.id,
        };

        const settleResult = await def.settle(call, context);

        if (settleResult.type === 'error') {
          throw new Error(settleResult.message);
        }
        return settleResult.value;
      },
    });
  }

  return result;
}
