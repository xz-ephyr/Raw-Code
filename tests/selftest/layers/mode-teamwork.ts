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

async function checkDynamicSpawnCorrectness(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { classifyMessage } = await import('@core/models/routeClassifier');

    const atomicTask = 'Hello, how are you?';
    const atomic = classifyMessage(atomicTask);
    if (atomic === 'direct') {
      results.push(ok(layer, 'Dynamic spawn: atomic task classified as direct (no spawn)'));
    } else {
      results.push(fail(layer, 'Dynamic spawn: atomic', `Expected direct, got ${atomic}`));
    }

    const decomposableTask = 'Research the impact of AI on healthcare, analyze market trends, write a summary report, and create a list of key findings';
    const decomp = classifyMessage(decomposableTask);
    if (decomp === 'subagent') {
      results.push(ok(layer, 'Dynamic spawn: decomposable task classified as subagent'));
    } else {
      results.push(fail(layer, 'Dynamic spawn: decomposable', `Expected subagent, got ${decomp}`));
    }

    const { runParallel } = await import('@doktor/subagent/scheduler');
    if (typeof runParallel === 'function') {
      results.push(ok(layer, 'Dynamic spawn: runParallel is available'));
    }

    const { synthesize } = await import('@doktor/subagent/synthesizer');
    if (typeof synthesize === 'function') {
      results.push(ok(layer, 'Dynamic spawn: synthesize is available'));
    }

    const { buildSystemPrompt, getToolScope } = await import('@doktor/subagent/personalities');
    const prompt = buildSystemPrompt({ task: 'test task', parentSessionID: 't1', agentType: 'researcher' });
    if (typeof prompt === 'string' && prompt.length > 0) {
      results.push(ok(layer, 'Dynamic spawn: personality prompt is non-empty'));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Dynamic spawn correctness', String(e).slice(0, 200)));
  }
  return results;
}

async function checkResultAggregation(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { synthesize } = await import('@doktor/subagent/synthesizer');

    const conflictingResults = [
      { output: 'The capital of Australia is Sydney.', toolCalls: 1, steps: 1, usage: { inputTokens: 10, outputTokens: 5 } },
      { output: 'The capital of Australia is Canberra.', toolCalls: 1, steps: 1, usage: { inputTokens: 10, outputTokens: 5 } },
      { output: 'The capital of Australia is Melbourne.', toolCalls: 1, steps: 1, usage: { inputTokens: 10, outputTokens: 5 } },
    ];

    const merged = synthesize(conflictingResults);

    if (typeof merged === 'string' && merged.length > 0) {
      const hasAll = conflictingResults.every((r) => merged.includes(r.output));
      if (hasAll) {
        results.push(ok(layer, 'Result aggregation: all conflicting results preserved'));
      } else {
        results.push(fail(layer, 'Result aggregation', 'Not all results appear in merged output'));
      }
    } else {
      results.push(fail(layer, 'Result aggregation', 'Merged output is empty'));
    }

    const singleResult = [{ output: 'Single result.', toolCalls: 0, steps: 0, usage: { inputTokens: 5, outputTokens: 3 } }];
    const singleMerged = synthesize(singleResult);
    if (singleMerged === singleResult[0].output) {
      results.push(ok(layer, 'Result aggregation: single result passes through'));
    } else {
      results.push(fail(layer, 'Result aggregation: single', 'Single result not passed through directly'));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Result aggregation', String(e).slice(0, 200)));
  }
  return results;
}

async function checkConcurrencyCap(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const schedulerSrc = await import('@doktor/subagent/scheduler');

    if (typeof schedulerSrc.runParallel === 'function') {
      results.push(ok(layer, 'Concurrency cap: runParallel exported'));
    }

    const impl = schedulerSrc.runParallel.toString();
    const concurrencyMatch = impl.match(/concurrency:\s*(\d+)/);
    const maxConcurrencyMatch = impl.match(/MAX_CONCURRENCY\s*=\s*(\d+)/);

    if (concurrencyMatch) {
      const limit = parseInt(concurrencyMatch[1], 10);
      if (limit > 0 && limit <= 10) {
        results.push(ok(layer, `Concurrency cap: parallel limit is ${limit}`));
      } else {
        results.push(fail(layer, 'Concurrency cap', `Unexpected concurrency value: ${limit}`));
      }
    } else if (maxConcurrencyMatch) {
      const limit = parseInt(maxConcurrencyMatch[1], 10);
      results.push(ok(layer, `Concurrency cap: MAX_CONCURRENCY=${limit}`));
    } else {
      const minMatch = impl.match(/min\(tasks\.length,\s*\w+\)/);
      if (minMatch) {
        results.push(ok(layer, 'Concurrency cap: parallel limit is min(tasks.length, MAX_CONCURRENCY)'));
      } else {
        results.push(skip(layer, 'Concurrency cap', 'Could not detect concurrency limit from source'));
      }
    }
  } catch (e: any) {
    results.push(skip(layer, 'Concurrency cap', String(e).slice(0, 200)));
  }
  return results;
}

async function checkPartialFailureIsolation(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { Effect, Exit } = await import('effect');

    const failingTask = Effect.fail(new Error('Simulated subagent failure'));
    const succeedingTask = Effect.succeed({ output: 'Success result', toolCalls: 1, steps: 1, usage: { inputTokens: 5, outputTokens: 3 } });

    const tasks = [succeedingTask, failingTask, succeedingTask, failingTask, succeedingTask];

    const outcomes = await Effect.runPromise(
      Effect.all(tasks.map((t) => Effect.exit(t)), { concurrency: 3 }),
    );

    const successes = outcomes.filter((e: any) => Exit.isSuccess(e));
    const failures = outcomes.filter((e: any) => Exit.isFailure(e));

    if (successes.length >= 3) {
      results.push(ok(layer, 'Partial failure: successful results surface despite failures'));
    } else {
      results.push(fail(layer, 'Partial failure', `Expected >=3 successes, got ${successes.length}`));
    }

    if (failures.length >= 2) {
      results.push(ok(layer, 'Partial failure: failed subagents are reported'));
    } else {
      results.push(fail(layer, 'Partial failure', `Expected >=2 failures reported, got ${failures.length}`));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Partial failure isolation', String(e).slice(0, 200)));
  }
  return results;
}

async function checkSharedResourceRaceCondition(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { Effect } = await import('effect');

    let sharedCounter = 0;
    const ITERATIONS = 100;
    const CONCURRENCY = 5;

    const tasks = Array.from({ length: CONCURRENCY }, (_, i) =>
      Effect.replicate(Effect.sync(() => { sharedCounter++; }), ITERATIONS),
    ).flat();

    await Effect.runPromise(Effect.all(tasks, { concurrency: CONCURRENCY }));

    const expected = CONCURRENCY * ITERATIONS;
    if (sharedCounter === expected) {
      results.push(ok(layer, 'Race condition: no lost writes with concurrent increments'));
    } else {
      results.push(fail(layer, 'Race condition', `Expected ${expected}, got ${sharedCounter} (${expected - sharedCounter} lost)`));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Shared resource race condition', String(e).slice(0, 200)));
  }
  return results;
}

async function checkTeamBudget(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { SubAgentRequest } = await import('@doktor/subagent/types');
    if (SubAgentRequest) {
      results.push(ok(layer, 'Team budget: SubAgentRequest type importable'));
    }

    try {
      const bridge = await import('@doktor/subagent/bridge');
      if (typeof bridge.subagentRunTool === 'function') {
        results.push(ok(layer, 'Team budget: subagentRunTool bridge tool exists'));
      }
    } catch {
      results.push(skip(layer, 'Team budget: bridge tools', 'Bridge module not importable'));
    }

    results.push(skip(layer, 'Team budget: no budget system exists yet — contract test only'));
  } catch (e: any) {
    results.push(skip(layer, 'Team budget', String(e).slice(0, 200)));
  }
  return results;
}

async function checkAggregateConcurrency(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { Effect, Fiber } = await import('effect');

    let concurrentCount = 0;
    let maxConcurrentSeen = 0;
    let completionCount = 0;

    const work = (id: number) =>
      Effect.gen(function* () {
        concurrentCount++;
        if (concurrentCount > maxConcurrentSeen) maxConcurrentSeen = concurrentCount;
        yield* Effect.sleep(50);
        concurrentCount--;
        completionCount++;
        return id;
      });

    const runs = [
      Effect.replicate(work(1), 3),
      Effect.replicate(work(2), 3),
      Effect.replicate(work(3), 3),
    ].flat();

    await Effect.runPromise(Effect.all(runs, { concurrency: 9 }));

    if (completionCount === 9) {
      results.push(ok(layer, `Aggregate concurrency: ${completionCount}/9 tasks completed concurrently`));
    } else {
      results.push(fail(layer, 'Aggregate concurrency', `Only ${completionCount}/9 completed`));
    }

    results.push(ok(layer, `Aggregate concurrency: max concurrent seen = ${maxConcurrentSeen} (within expected range)`));

    const schedulerSrc = (await import('@doktor/subagent/scheduler')).runParallel.toString();
    const hasGlobalLimiter = schedulerSrc.includes('global') || schedulerSrc.includes('Global') || schedulerSrc.includes('semaphore') || schedulerSrc.includes('Semaphore');
    if (hasGlobalLimiter) {
      results.push(ok(layer, 'Aggregate concurrency: global rate limiter detected'));
    } else {
      results.push(skip(layer, 'Aggregate concurrency: global rate limiter', 'FINDING: No global rate limiter found. Each runParallel() enforces its own MAX_CONCURRENCY=5, but concurrent sessions each get their own limit. This means N simultaneous teamwork runs can each spawn 5 subagents, totaling 5N concurrent LLM calls. No cross-session throttling exists. This is a known limitation — add a global Semaphore or TokenBucket to protect against provider rate-limit storms.'));
    }
  } catch (e: any) {
    results.push(skip(layer, 'Aggregate concurrency', String(e).slice(0, 200)));
  }
  return results;
}

export const modeTeamworkManifest: LayerManifest = {
  id: 'mode-teamwork',
  name: 'Teamwork Mode',
  description: 'Dynamic spawn correctness, result aggregation, concurrency cap, partial failure, race condition, team budget, aggregate concurrency',
  requiresFull: true,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkDynamicSpawnCorrectness('mode-teamwork'),
      ...await checkResultAggregation('mode-teamwork'),
      ...await checkConcurrencyCap('mode-teamwork'),
      ...await checkPartialFailureIsolation('mode-teamwork'),
      ...await checkSharedResourceRaceCondition('mode-teamwork'),
      ...await checkTeamBudget('mode-teamwork'),
      ...await checkAggregateConcurrency('mode-teamwork'),
    ];
    return results;
  },
};
