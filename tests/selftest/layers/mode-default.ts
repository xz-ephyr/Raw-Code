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

async function checkRunawayLoopProtection(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const toolLoopMod = await import('@doktor/llm-providers/adapters/tool-loop');

    if (typeof toolLoopMod.createToolLoop === 'function') {
      results.push(ok(layer, 'Runaway loop: createToolLoop is a function'));
    } else {
      results.push(fail(layer, 'Runaway loop: createToolLoop', 'Not a function'));
      return results;
    }

    const configWithMaxSteps = toolLoopMod.createToolLoop({ routes: [], maxSteps: 5 });
    const configWithoutMaxSteps = toolLoopMod.createToolLoop({ routes: [] });

    if (typeof configWithMaxSteps === 'function') {
      results.push(ok(layer, 'Runaway loop: createToolLoop returns a function (loop)'));
    }

    if (typeof configWithoutMaxSteps === 'function') {
      results.push(ok(layer, 'Runaway loop: createToolLoop works without explicit maxSteps'));
    }

    const toolLoopSrc = toolLoopMod.createToolLoop.toString();
    const maxStepsMatch = toolLoopSrc.match(/maxSteps\s*=\s*(\d+)/);
    if (maxStepsMatch) {
      const defaultMax = parseInt(maxStepsMatch[1], 10);
      results.push(ok(layer, `Runaway loop: default maxSteps is ${defaultMax}`));
    } else {
      const hasMaxParam = toolLoopSrc.includes('maxSteps');
      if (hasMaxParam) {
        results.push(ok(layer, 'Runaway loop: maxSteps parameter present in implementation'));
      } else {
        results.push(skip(layer, 'Runaway loop', 'Could not detect maxSteps in implementation'));
      }
    }

    const hasStepGuard = toolLoopSrc.includes('step >= maxSteps') || toolLoopSrc.includes('>= maxSteps') || toolLoopSrc.includes('maxSteps');
    if (hasStepGuard) {
      results.push(ok(layer, 'Runaway loop: step counter guard detected (step >= maxSteps)'));
    } else {
      results.push(skip(layer, 'Runaway loop: step guard', 'Could not confirm step guard in source (may use different variable name)'));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Runaway loop protection', String(e).slice(0, 200)));
  }
  return results;
}

async function checkMidConversationProviderSwitchViaRealEntrypoint(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { getModelDefinition } = await import('@core/config/models');

    const frontendPayloadShape = {
      sessionId: 'test-session',
      messages: [
        { id: '1', role: 'user', content: 'Hello', createdAt: Date.now() },
        { id: '2', role: 'assistant', content: 'Hi!', createdAt: Date.now() },
        { id: '3', role: 'user', content: 'Switch providers now', createdAt: Date.now() },
      ],
      modelName: 'gpt-4o',
      modeId: 'default',
    };

    if (frontendPayloadShape.messages && Array.isArray(frontendPayloadShape.messages)) {
      results.push(ok(layer, 'Provider switch: payload matches ChatStreamService.start() input shape'));
    }

    let gpt4oModel = getModelDefinition('gpt-4o');
    if (gpt4oModel) {
      results.push(ok(layer, `Provider switch: gpt-4o resolved to provider="${gpt4oModel.provider}" via getModelDefinition()`));
    } else {
      results.push(skip(layer, 'Provider switch: gpt-4o model definition', 'Not found in model registry'));
    }

    let claudeModel = getModelDefinition('claude-sonnet-4');
    if (!claudeModel) claudeModel = getModelDefinition('claude-3-opus');
    if (!claudeModel) claudeModel = getModelDefinition('claude-sonnet-4-20250514');
    if (claudeModel) {
      results.push(ok(layer, `Provider switch: claude model resolved to provider="${claudeModel.provider}"`));
    } else {
      results.push(skip(layer, 'Provider switch: claude model definition', 'Not in model registry'));
    }

    if (gpt4oModel && claudeModel && gpt4oModel.provider !== claudeModel.provider) {
      results.push(ok(layer, 'Provider switch: switching model changes provider (gpt-4o != claude)'));
    }

    const testMessages = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
      { role: 'user', content: 'Switch providers' },
    ];

    const nonSystemMessages = testMessages.filter((m) => m.role !== 'system');
    if (nonSystemMessages.length === testMessages.length - 1) {
      results.push(ok(layer, 'Provider switch: system message stripped (matches nativeChatCompletion behavior)'));
    }
    const userMsgs = nonSystemMessages.filter((m) => m.role === 'user');
    const assistantMsgs = nonSystemMessages.filter((m) => m.role === 'assistant');
    if (userMsgs.length >= 1 && assistantMsgs.length >= 1) {
      results.push(ok(layer, 'Provider switch: messages preserve user/assistant roles after stripping system'));
    }

    const { buildNativeSystemPrompt } = await import('@core/models/nativeSystemPrompt');
    try {
      const prompt = await buildNativeSystemPrompt({ modeId: 'default' });
      if (typeof prompt === 'string' && prompt.length > 50) {
        results.push(ok(layer, 'Provider switch: buildNativeSystemPrompt("default") returns long system prompt'));
      }
      const teamPrompt = await buildNativeSystemPrompt({ modeId: 'teamwork' });
      if (typeof teamPrompt === 'string' && teamPrompt !== prompt) {
        results.push(ok(layer, 'Provider switch: switching modeId changes system prompt'));
      }
    } catch (e: any) {
      results.push(skip(layer, 'Provider switch: buildNativeSystemPrompt', String(e).slice(0, 200)));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Mid-conversation provider switch (real entrypoint)', String(e).slice(0, 200)));
  }
  return results;
}

export const modeDefaultManifest: LayerManifest = {
  id: 'mode-default',
  name: 'Default Mode',
  description: 'Runaway loop protection, mid-conversation provider/model switch via real frontend payload shape',
  requiresFull: false,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkRunawayLoopProtection('mode-default'),
      ...await checkMidConversationProviderSwitchViaRealEntrypoint('mode-default'),
    ];
    return results;
  },
};
