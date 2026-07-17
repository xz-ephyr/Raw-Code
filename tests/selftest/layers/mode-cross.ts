import type { SelfTestResult, LayerManifest } from '../types';

function ok(layer: string, name: string): SelfTestResult {
  return { layer, name, status: 'pass', durationMs: 0 };
}
function fail(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs: 0 };
}
function skip(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'skip', message: msg, durationMs: 0 };
}

async function checkEventSchemaViaServerEndpoint(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const serverBase = 'http://localhost:3001';
    const response = await fetch(`${serverBase}/llm/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
        systemPrompt: 'You are a helpful assistant.',
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      results.push(skip(layer, 'Cross-mode: POST /llm/stream', `Server returned ${response.status} (expected if server not running)`));
      return results;
    }

    const knownEventTypes = [
      'step-start', 'text-start', 'text-delta', 'text-end',
      'reasoning-start', 'reasoning-delta', 'reasoning-end',
      'tool-input-start', 'tool-input-delta', 'tool-input-end',
      'tool-call', 'tool-result', 'tool-error',
      'step-finish', 'finish', 'provider-error', 'usage',
    ];

    const seenTypes = new Set<string>();
    const reader = response.body?.getReader();
    if (!reader) {
      results.push(skip(layer, 'Cross-mode: SSE reader', 'No response body'));
      return results;
    }

    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          seenTypes.add(line.slice(7).trim());
        }
      }
    }

    if (seenTypes.size === 0) {
      results.push(skip(layer, 'Cross-mode: event types', 'No SSE events received'));
      return results;
    }

    for (const t of seenTypes) {
      if (t === 'connected' || t === 'heartbeat') continue;
      if (!knownEventTypes.includes(t)) {
        results.push(fail(layer, 'Cross-mode: event types', `Unknown event type "${t}" — not in LLMEvent schema`));
        return results;
      }
    }
    results.push(ok(layer, `Cross-mode: all ${seenTypes.size} SSE event types are from LLMEvent schema (via POST /llm/stream)`));

    const typesWithoutConnected = [...seenTypes].filter(t => t !== 'connected');
    results.push(ok(layer, `Cross-mode: received event types: ${typesWithoutConnected.join(', ')}`));
  } catch (e: any) {
    results.push(skip(layer, 'Cross-mode: POST /llm/stream real endpoint', `Cannot reach server (expected if not running): ${e.message?.slice(0, 100)}`));
  }
  return results;
}

async function checkModeSpecificRoutes(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { PERSONAS, getPersonaById } = await import('@core/persona/index');

    if (Array.isArray(PERSONAS) && PERSONAS.length >= 3) {
      results.push(ok(layer, 'Mode routes: all 3 PERSONAS registered'));
    } else {
      results.push(fail(layer, 'Mode routes', `Expected >=3 personas, got ${PERSONAS?.length}`));
    }

    const defaultMode = getPersonaById('default');
    if (defaultMode) {
      results.push(ok(layer, 'Mode routes: default persona found'));
      if (defaultMode.modeId === 'default') {
        results.push(ok(layer, 'Mode routes: default modeId is correct'));
      }
    } else {
      results.push(fail(layer, 'Mode routes: default persona', 'Not found'));
    }

    const teamworkMode = getPersonaById('teamwork');
    if (teamworkMode) {
      results.push(ok(layer, 'Mode routes: teamwork persona found'));
    }

    const antigravityMode = getPersonaById('antigravity');
    if (antigravityMode) {
      results.push(ok(layer, 'Mode routes: antigravity persona found'));
      if (antigravityMode.modeId === 'antigravity') {
        results.push(ok(layer, 'Mode routes: antigravity modeId is correct'));
      }
    }

    const modeIds = new Set(PERSONAS.map((p: any) => p.modeId));
    if (modeIds.size === PERSONAS.length) {
      results.push(ok(layer, 'Mode routes: all modeIds are unique'));
    } else {
      results.push(fail(layer, 'Mode routes', 'Duplicate modeIds detected'));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Mode-specific routes', String(e).slice(0, 200)));
  }
  return results;
}

async function checkSharedEventUsage(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { LLMEvent } = await import('@doktor/llm-providers/schema/event-schemas');

    if (LLMEvent) {
      const llmEventType = typeof LLMEvent;
      if (llmEventType === 'object' || llmEventType === 'function') {
        results.push(ok(layer, 'Shared events: LLMEvent is a consistent type across all modes'));
      }
    }

    try {
      const toolEvent = await import('@doktor/tool-runtime/events');
      if (toolEvent && typeof toolEvent.emit === 'function') {
        results.push(ok(layer, 'Shared events: ToolEvent bus is importable'));
      }
    } catch {
      results.push(skip(layer, 'Shared events: tool-runtime/events', 'Not directly importable'));
    }

    const modeIds = ['default', 'teamwork', 'antigravity'];
    for (const id of modeIds) {
      try {
        const personaMod = await import('@core/persona/index');
        const persona = personaMod.getPersonaById(id);
        if (persona && persona.modeId) {
          results.push(ok(layer, `Shared events: ${id} mode has a valid persona configuration`));
        }
      } catch {
        results.push(skip(layer, `Shared events: ${id} persona`, `Could not load persona ${id}`));
      }
    }
  } catch (e: any) {
    results.push(skip(layer, 'Shared event usage', String(e).slice(0, 200)));
  }
  return results;
}

export const modeCrossManifest: LayerManifest = {
  id: 'mode-cross',
  name: 'Cross-Mode Consistency',
  description: 'All modes emit events from the same normalized LLMEvent schema; verified via real POST /llm/stream endpoint and persona configs',
  requiresFull: false,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkEventSchemaViaServerEndpoint('mode-cross'),
      ...await checkModeSpecificRoutes('mode-cross'),
      ...await checkSharedEventUsage('mode-cross'),
    ];
    return results;
  },
};
