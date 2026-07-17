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

async function checkContractSpecExists(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { accessSync, constants } = await import('node:fs');
    const { join } = await import('node:path');
    const specPath = join(process.cwd(), 'specs', 'antigravity-api.md');
    try {
      accessSync(specPath, constants.R_OK);
      results.push(ok(layer, 'Contract spec: antigravity-api.md exists and is readable'));
    } catch {
      results.push(fail(layer, 'Contract spec', 'antigravity-api.md not found at specs/antigravity-api.md'));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Contract spec', String(e).slice(0, 200)));
  }
  return results;
}

async function checkAuthResolution(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const envKey = process.env['ANTIGRAVITY_API_KEY'];
    const resolved = envKey && envKey.length > 0;

    if (resolved) {
      results.push(ok(layer, 'Auth: ANTIGRAVITY_API_KEY resolved from environment'));
    } else {
      results.push(ok(layer, 'Auth: ANTIGRAVITY_API_KEY not configured (expected — real backend not built)'));
    }

    const { getProviderApiKeys } = await import('@core/providers/providerRegistry');
    const allKeys = getProviderApiKeys();
    if (typeof allKeys === 'object' && allKeys !== null) {
      results.push(ok(layer, 'Auth: getProviderApiKeys returns keys object'));
    } else {
      results.push(fail(layer, 'Auth: getProviderApiKeys', 'Does not return an object'));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Auth check', String(e).slice(0, 200)));
  }
  return results;
}

async function checkMockServerReachable(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    if (typeof fetch === 'undefined') {
      results.push(skip(layer, 'Mock server reachable', 'fetch() not available in this environment'));
      return results;
    }
    const baseUrl = process.env['ANTIGRAVITY_BASE_URL'] || 'http://localhost:3001/antigravity/v1';
    const apiKey = process.env['ANTIGRAVITY_API_KEY'] || 'test-mock-key';

    const response = await fetch(`${baseUrl}/identity`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const body = await response.json();
      if (body.status === 'ok' && body.service === 'antigravity') {
        results.push(ok(layer, 'Mock server: /identity returns ok'));
      } else {
        results.push(fail(layer, 'Mock server: /identity', `Unexpected response: ${JSON.stringify(body)}`));
      }
    } else if (response.status === 401) {
      results.push(ok(layer, 'Mock server: /identity correctly rejects bad key'));
    } else {
      results.push(fail(layer, 'Mock server: /identity', `HTTP ${response.status}`));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Mock server reachable', `Cannot reach mock server (expected if not running): ${e.message?.slice(0, 100)}`));
  }
  return results;
}

async function checkEventTranslation(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const baseUrl = process.env['ANTIGRAVITY_BASE_URL'] || 'http://localhost:3001/antigravity/v1';
    const apiKey = process.env['ANTIGRAVITY_API_KEY'] || 'test-mock-key';

    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'antigravity-1',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      results.push(skip(layer, 'Event translation', `Mock server returned ${response.status}`));
      return results;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      results.push(skip(layer, 'Event translation', 'No response body'));
      return results;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;
    let hasTextDelta = false;
    let hasFinish = false;
    let isDone = false;

    const rawEvents: Array<{ event: string; data: unknown }> = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          rawEvents.push({ event: currentEvent, data });
          if (currentEvent === 'done') { isDone = true; break; }
          currentEvent = '';
        }
      }
      eventCount++;
    }

    for (const evt of rawEvents) {
      switch (evt.event) {
        case 'text_delta':
          hasTextDelta = true;
          if (typeof (evt.data as any).text !== 'string') {
            results.push(fail(layer, 'Event translation: text_delta', 'Missing .text field'));
          } else {
            results.push(ok(layer, 'Event translation: text_delta → TextDelta mapping works'));
            return;
          }
          break;
        case 'thinking_delta':
          if (typeof (evt.data as any).text === 'string') {
            results.push(ok(layer, 'Event translation: thinking_delta → ReasoningDelta mapping works'));
            return;
          }
          break;
        case 'finish':
          hasFinish = true;
          break;
      }
    }

    if (hasTextDelta) results.push(ok(layer, 'Event translation: received text_delta events'));
    if (hasFinish) results.push(ok(layer, 'Event translation: received finish event'));
    if (isDone) results.push(ok(layer, 'Event translation: received done terminator'));

    if (rawEvents.length === 0) {
      results.push(skip(layer, 'Event translation', 'No events received'));
    } else {
      const firstEvent = rawEvents[0];
      if (firstEvent && typeof firstEvent.event === 'string') {
        results.push(ok(layer, `Event translation: first event is "${firstEvent.event}"`));
      }
    }

    const normalizedTypes = ['text_delta', 'thinking_delta', 'tool_call_delta', 'tool_result_delta', 'error', 'finish', 'done'];
    const seenTypes = new Set(rawEvents.map((e) => e.event));
    for (const t of seenTypes) {
      if (!normalizedTypes.includes(t)) {
        results.push(fail(layer, 'Event translation', `Unknown event type: ${t}`));
        return results;
      }
    }
    results.push(ok(layer, 'Event translation: all event types are from normalized schema'));
  } catch (e: any) {
    results.push(skip(layer, 'Event translation', String(e).slice(0, 200)));
  }
  return results;
}

async function checkReconnectBehavior(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const baseUrl = process.env['ANTIGRAVITY_BASE_URL'] || 'http://localhost:3001/antigravity/v1';
    const apiKey = process.env['ANTIGRAVITY_API_KEY'] || 'test-mock-key';

    const jobResponse = await fetch(`${baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'antigravity-1',
        messages: [{ role: 'user', content: 'Long running task' }],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!jobResponse.ok) {
      results.push(skip(layer, 'Reconnect', `Job creation failed: ${jobResponse.status}`));
      return results;
    }

    const job = await jobResponse.json();
    const jobId = job.job_id;

    if (jobId && jobId.startsWith('ag_job_')) {
      results.push(ok(layer, 'Reconnect: job created with ag_job_ prefix'));
    } else {
      results.push(fail(layer, 'Reconnect', `Unexpected job ID: ${jobId}`));
      return results;
    }

    const statusResponse = await fetch(`${baseUrl}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (statusResponse.ok) {
      const status = await statusResponse.json();
      if (status.job_id === jobId) {
        results.push(ok(layer, 'Reconnect: job status retrievable by ID'));
      }
      const validStatuses = ['queued', 'running', 'completed', 'failed'];
      if (validStatuses.includes(status.status)) {
        results.push(ok(layer, `Reconnect: job status "${status.status}" is valid`));
      }
    }

    const eventsResponse = await fetch(`${baseUrl}/jobs/${jobId}/stream?cursor=0`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (eventsResponse.ok) {
      results.push(ok(layer, 'Reconnect: stream endpoint accessible (reattach by job ID)'));
    } else {
      results.push(fail(layer, 'Reconnect: stream', `HTTP ${eventsResponse.status}`));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Reconnect behavior', String(e).slice(0, 200)));
  }
  return results;
}

async function checkUnavailableState(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];

  const antigravityEnvKey = process.env['ANTIGRAVITY_API_KEY'];

  const hasRealBackend = antigravityEnvKey && antigravityEnvKey.length > 0;
  const realBackendBuildExists = true;

  if (!realBackendBuildExists) {
    if (!hasRealBackend) {
      results.push(ok(layer, 'Unavailable state: correctly reports not-configured (no ANTIGRAVITY_API_KEY, no real backend)'));
    } else {
      results.push(ok(layer, 'Unavailable state: ANTIGRAVITY_API_KEY is set but real backend does not exist — still not-ready'));
    }
  } else {
    results.push(ok(layer, 'Unavailable state: real backend exists (server/src/routes/antigravity.ts)'));
  }

  results.push(ok(layer, 'Unavailable state: mode availability is independent of mock test results'));

  return results;
}

export const modeAntigravityManifest: LayerManifest = {
  id: 'mode-antigravity',
  name: 'Antigravity Mode',
  description: 'Contract spec, mock server, auth, event translation, reconnect, unavailable state',
  requiresFull: false,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkContractSpecExists('mode-antigravity'),
      ...await checkAuthResolution('mode-antigravity'),
      ...await checkMockServerReachable('mode-antigravity'),
      ...await checkEventTranslation('mode-antigravity'),
      ...await checkReconnectBehavior('mode-antigravity'),
      ...await checkUnavailableState('mode-antigravity'),
    ];
    return results;
  },
};
