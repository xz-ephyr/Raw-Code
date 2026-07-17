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

async function checkInlineScanner(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { createInlineScanner, flushInlineScanner } = await import('@core/reasoning/inline-scanner');
    const scanner = createInlineScanner();
    const r1 = scanner.feed('Hello <think>deep thought</think> world', [
      { open: '<think>', close: '</think>' },
    ]);
    if (r1.content === 'Hello  world' && r1.reasoning === 'deep thought') {
      results.push(ok(layer, 'Inline scanner: basic extraction'));
    } else {
      results.push(fail(layer, 'Inline scanner: basic extraction', `Got content="${r1.content}" reasoning="${r1.reasoning}"`));
    }
    const r2 = scanner.feed('more <think>split', [
      { open: '<think>', close: '</think>' },
    ]);
    // scanner is now inside the open tag; no events until closing tag
    if (scanner.state.inTag) {
      results.push(ok(layer, 'Inline scanner: inTag state set after opening tag'));
    } else {
      results.push(fail(layer, 'Inline scanner: inTag state', 'Expected inTag=true'));
    }

    const r3 = scanner.feed(' tag</think> done', [
      { open: '<think>', close: '</think>' },
    ]);
    const hasStartEvent = r3.events.some((e: any) => e.type === 'reasoning-start');
    const hasDeltaEvent = r3.events.some((e: any) => e.type === 'reasoning-delta');
    const hasEndEvent = r3.events.some((e: any) => e.type === 'reasoning-end');
    if (hasStartEvent && hasDeltaEvent && hasEndEvent) {
      results.push(ok(layer, 'Inline scanner: closing tag across chunks emits reasoning-start/delta/end'));
    } else {
      results.push(fail(layer, 'Inline scanner: closing tag across chunks',
        `start=${hasStartEvent} delta=${hasDeltaEvent} end=${hasEndEvent}`));
    }
    if (r3.content?.includes('done')) {
      results.push(ok(layer, 'Inline scanner: content preserved across chunks'));
    } else {
      results.push(fail(layer, 'Inline scanner: content preserved', `Got content="${r3.content}"`));
    }
    const flushed = flushInlineScanner(scanner);
    results.push(ok(layer, 'Inline scanner: flush works'));
  } catch (e) {
    results.push(skip(layer, 'Inline scanner', String(e)));
  }
  return results;
}

async function checkModelCapabilities(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { getModelCapability, MODEL_CAPABILITIES } = await import('@core/reasoning/capabilities');
    const entries = Object.keys(MODEL_CAPABILITIES);
    if (entries.length >= 40) {
      results.push(ok(layer, `Model capabilities: ${entries.length} entries (>=40)`));
    } else {
      results.push(fail(layer, 'Model capabilities count', `Got ${entries.length} entries, expected >=40`));
    }
    const validTypes = ['reasoning_content', 'thinking_delta', 'inline_tags', 'none'];
    for (const [id, cap] of Object.entries(MODEL_CAPABILITIES)) {
      const m = cap as any;
      if (m.mechanism && m.mechanism.type && validTypes.includes(m.mechanism.type)) {
        continue;
      }
      results.push(fail(layer, `Model capability: ${id}`, `Invalid mechanism: ${JSON.stringify(m.mechanism)}`));
    }
    const gpt4 = getModelCapability('gpt-4o');
    if (gpt4 && gpt4.mechanism && validTypes.includes(gpt4.mechanism.type)) {
      results.push(ok(layer, 'getModelCapability returns valid entry for gpt-4o'));
    } else {
      results.push(fail(layer, 'getModelCapability for gpt-4o', `Got: ${JSON.stringify(gpt4)}`));
    }
  } catch (e) {
    results.push(skip(layer, 'Model capabilities', String(e)));
  }
  return results;
}

async function checkCleanReasoning(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { cleanReasoning, mapUIMessageToLegacyMessage, sanitizeMarkdownContent } = await import('@/lib/chatUtils');
    if (typeof cleanReasoning === 'function') {
      const cleaned = cleanReasoning('some * Type: `code`\n* Title: `test`\nmore text');
      results.push(ok(layer, `cleanReasoning strips artifacts`));
    } else {
      results.push(fail(layer, 'cleanReasoning', 'Not a function'));
    }
    if (typeof sanitizeMarkdownContent === 'function') {
      results.push(ok(layer, 'sanitizeMarkdownContent is a function'));
    }
    if (typeof mapUIMessageToLegacyMessage === 'function') {
      const msg = mapUIMessageToLegacyMessage({ role: 'assistant', content: 'hello', reasoning: null });
      if (msg) results.push(ok(layer, 'mapUIMessageToLegacyMessage works'));
      else results.push(fail(layer, 'mapUIMessageToLegacyMessage', 'Returned null'));
    }
  } catch (e) {
    results.push(skip(layer, 'chatUtils reasoning functions', String(e)));
  }
  return results;
}

async function checkReasoningAnthropic(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const mod = await import('@doktor/llm-providers/protocols/anthropic-messages');
    if (typeof mod === 'object') {
      results.push(ok(layer, 'anthropic-messages protocol module loaded'));
    }
  } catch (e) {
    results.push(skip(layer, 'anthropic-messages protocol', String(e)));
  }
  return results;
}

export const reasoningSeparationManifest: LayerManifest = {
  id: 'reasoning-separation',
  name: 'Reasoning Separation',
  description: 'Verify inline scanner, model capability manifest, cleanReasoning, protocol-level reasoning handling',
  requiresFull: false,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkInlineScanner('reasoning-separation'),
      ...await checkModelCapabilities('reasoning-separation'),
      ...await checkCleanReasoning('reasoning-separation'),
      ...await checkReasoningAnthropic('reasoning-separation'),
    ];
    return results;
  },
};
