import { registerContentTools, registerGlobal, materialize, toAISDKTools } from '@doktor/tool-runtime';
import type { Materialization, AISDKSessionContext } from '@doktor/tool-runtime';
import { subagentRunTool, composeRunTool } from '@doktor/subagent';
import { initializeConnectorTools } from '@doktor/tool-runtime/connector';

let initialized = false;

export function ensureToolRuntimeInit(): void {
  if (initialized) return;
  registerContentTools('content');
  registerGlobal('subagent_run', subagentRunTool, 'builtin');
  registerGlobal('compose_run', composeRunTool, 'builtin');
  initialized = true;
}

export async function buildRuntimeTools(
  sessionContext?: AISDKSessionContext,
  includeContent?: boolean,
): Promise<Record<string, any>> {
  ensureToolRuntimeInit();
  
  // Initialize connector tools for this session
  if (sessionContext?.sessionID) {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const connectedProviders = await fetchConnectedProviders(baseUrl);
      for (const provider of connectedProviders) {
        await initializeConnectorTools({
          sessionID: sessionContext.sessionID,
          provider,
          baseUrl,
        });
      }
    } catch (err) {
      console.warn('[initToolRuntime] Failed to initialize connector tools:', err);
    }
  }
  
  const sources = includeContent ? (['content', 'builtin', 'session', 'connector'] as const) : (['builtin', 'session', 'connector'] as const);
  const mat = materialize({ filterBySource: sources, sessionID: sessionContext?.sessionID });
  return toAISDKTools(mat, undefined, sessionContext);
}

async function fetchConnectedProviders(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/connectors/status`, {
      credentials: 'include',
    });
    if (!response.ok) return [];
    const data = await response.json() as Record<string, { connected: boolean }>;
    return Object.entries(data)
      .filter(([, status]) => status.connected)
      .map(([provider]) => provider);
  } catch {
    return [];
  }
}

export { materialize, toAISDKTools };
export type { Materialization };
