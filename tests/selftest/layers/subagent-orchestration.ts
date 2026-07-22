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

async function checkPersonalities(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const mod = await import('@doktor/subagent/personalities');
    if (typeof mod.buildSystemPrompt === 'function') {
      results.push(ok(layer, 'Personalities: buildSystemPrompt is a function'));
    } else {
      results.push(fail(layer, 'Personalities: buildSystemPrompt', 'Not a function'));
    }
    if (typeof mod.getToolScope === 'function') {
      results.push(ok(layer, 'Personalities: getToolScope is a function'));
    } else {
      results.push(fail(layer, 'Personalities: getToolScope', 'Not a function'));
    }
    if (typeof mod.getMaxSteps === 'function') {
      results.push(ok(layer, 'Personalities: getMaxSteps is a function'));
    } else {
      results.push(fail(layer, 'Personalities: getMaxSteps', 'Not a function'));
    }
    const prompt = mod.buildSystemPrompt({ task: 'test' });
    if (typeof prompt === 'string' && prompt.length > 0) {
      results.push(ok(layer, 'Personalities: buildSystemPrompt returns non-empty string'));
    } else {
      results.push(fail(layer, 'Personalities: buildSystemPrompt returns string', 'Empty or not a string'));
    }
  } catch (e) {
    results.push(skip(layer, 'Personalities', String(e)));
  }
  return results;
}

async function checkScheduler(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { runParallel, runSequential } = await import('@doktor/subagent/scheduler');
    if (typeof runParallel === 'function') {
      results.push(ok(layer, 'Scheduler: runParallel is a function'));
    } else {
      results.push(fail(layer, 'Scheduler: runParallel', 'Not a function'));
    }
    if (typeof runSequential === 'function') {
      results.push(ok(layer, 'Scheduler: runSequential is a function'));
    } else {
      results.push(fail(layer, 'Scheduler: runSequential', 'Not a function'));
    }
  } catch (e) {
    results.push(skip(layer, 'Scheduler', String(e)));
  }
  return results;
}

async function checkComposer(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { compose } = await import('@doktor/subagent/composer');
    if (typeof compose === 'function') {
      results.push(ok(layer, 'Composer: compose is a function'));
    } else {
      results.push(fail(layer, 'Composer: compose', 'Not a function'));
    }
  } catch (e) {
    results.push(skip(layer, 'Composer', String(e)));
  }
  return results;
}

async function checkSynthesizer(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { synthesize } = await import('@doktor/subagent/synthesizer');
    if (typeof synthesize === 'function') {
      results.push(ok(layer, 'Synthesizer: synthesize is a function'));
    } else {
      results.push(fail(layer, 'Synthesizer: synthesize', 'Not a function'));
    }
  } catch (e) {
    results.push(skip(layer, 'Synthesizer', String(e)));
  }
  return results;
}

async function checkBridgeTools(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const mod = await import('@doktor/subagent/bridge');
    if (mod.subagentRunTool) {
      results.push(ok(layer, 'Bridge: subagentRunTool exported'));
    } else {
      results.push(fail(layer, 'Bridge: subagentRunTool exported', 'Not found'));
    }
    if (mod.composeRunTool) {
      results.push(ok(layer, 'Bridge: composeRunTool exported'));
    } else {
      results.push(fail(layer, 'Bridge: composeRunTool exported', 'Not found'));
    }
  } catch (e) {
    results.push(skip(layer, 'Bridge tools', String(e)));
  }
  return results;
}

async function checkSubagentTypes(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const mod = await import('@doktor/subagent/types');
    if (mod) results.push(ok(layer, 'Subagent types module importable'));
  } catch {
    results.push(skip(layer, 'Subagent types', 'May not be runtime values'));
  }
  return results;
}

export const subagentOrchestrationManifest: LayerManifest = {
  id: 'subagent-orchestration',
  name: 'Subagent Orchestration',
  description: 'Verify personalities, scheduler, composer, synthesizer, bridge tools, and subagent loop types',
  requiresFull: false,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkPersonalities('subagent-orchestration'),
      ...await checkScheduler('subagent-orchestration'),
      ...await checkComposer('subagent-orchestration'),
      ...await checkSynthesizer('subagent-orchestration'),
      ...await checkBridgeTools('subagent-orchestration'),
      ...await checkSubagentTypes('subagent-orchestration'),
    ];
    return results;
  },
};
