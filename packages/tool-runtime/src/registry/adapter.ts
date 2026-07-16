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
      const obj = z.object(shape);
      const required = schema.required;
      if (Array.isArray(required) && required.length > 0) {
        const requiredSet = new Set(required);
        for (const key of Object.keys(shape)) {
          if (!requiredSet.has(key)) {
            shape[key] = shape[key].optional();
          }
        }
        return z.object(shape);
      }
      return obj.partial();
    }
    default:
      return z.any();
  }
}

export type AISDKSessionContext = {
  sessionID: string;
  agentID: string;
  assistantMessageID: string;
  resolveModel?: (name: string) => unknown;
};

export function toAISDKTools(
  materialization: Materialization,
  permissions?: PermissionRuleset,
  sessionContext?: AISDKSessionContext,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const def of materialization.definitions) {
    if (permissions) {
      if (!checkPermission(def.name, 'use', def.name, permissions)) continue;
    }

    let zodInput: z.ZodTypeAny;
    try {
      zodInput = jsonSchemaToZod(def.inputSchema);
    } catch (e) {
      console.warn(`[adapter] Failed to convert schema for tool "${def.name}":`, e);
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
          resolveModel: sessionContext?.resolveModel,
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
