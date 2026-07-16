import { registerContentTools, registerGlobal, materialize, toAISDKTools } from '@doktor/tool-runtime';
import type { Materialization, AISDKSessionContext } from '@doktor/tool-runtime';
import { subagentRunTool, composeRunTool } from '@doktor/subagent';

let initialized = false;

export function ensureToolRuntimeInit(): void {
  if (initialized) return;
  registerContentTools('content');
  registerGlobal('subagent_run', subagentRunTool, 'builtin');
  registerGlobal('compose_run', composeRunTool, 'builtin');
  initialized = true;
}

export function buildRuntimeTools(
  sessionContext?: AISDKSessionContext,
  includeContent?: boolean,
): Record<string, any> {
  ensureToolRuntimeInit();
  const sources = includeContent ? ['content', 'builtin'] as const : ['builtin'] as const;
  const mat = materialize({ filterBySource: sources });
  return toAISDKTools(mat, undefined, sessionContext);
}

export { materialize, toAISDKTools };
export type { Materialization };
