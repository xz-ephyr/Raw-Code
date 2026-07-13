import { toMaterializedTool } from '../tool/make';
import { listMerged, clearSession } from './session';
import { clearGlobal } from './global';
import { checkPermission } from '../tool/withPermission';
import type { PermissionRuleset } from '../tool/withPermission';
import type { MaterializedTool, ToolCall, ToolExecuteContext, ToolResultValue } from '../types';

export type FilterSource = 'builtin' | 'connector' | 'content' | 'session';

export interface MaterializationOptions {
  permissions?: PermissionRuleset;
  filterByScope?: readonly string[];
  filterBySource?: readonly FilterSource[];
}

export interface Materialization {
  readonly definitions: MaterializedTool[];
  readonly definitionsMap: Map<string, MaterializedTool>;
  readonly settle: (call: ToolCall, context: ToolExecuteContext) => Promise<ToolResultValue>;
}

export function materialize(options?: MaterializationOptions): Materialization {
  const merged = listMerged();
  const definitions: MaterializedTool[] = [];
  const definitionsMap = new Map<string, MaterializedTool>();

  for (const [name, entry] of merged) {
    if (options?.filterByScope && !options.filterByScope.includes(name)) continue;
    if (options?.filterBySource && !options.filterBySource.includes(entry.source)) continue;
    if (options?.permissions) {
      if (!checkPermission(name, 'use', name, options.permissions)) continue;
    }

    const materialized = toMaterializedTool(name, entry.tool);
    definitions.push(materialized);
    definitionsMap.set(name, materialized);
  }

  return {
    definitions,
    definitionsMap,
    settle: async (call, context) => {
      const tool = definitionsMap.get(call.name);
      if (!tool) {
        return { type: 'error', message: `Unknown tool: ${call.name}` };
      }
      return tool.settle(call, context);
    },
  };
}

export function clearAllRegistrations(): void {
  clearGlobal();
  clearSession();
}
