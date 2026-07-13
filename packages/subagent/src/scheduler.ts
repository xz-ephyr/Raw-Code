import { Effect } from 'effect';
import { runSubAgent } from './subagent';
import type { SubAgentRequest, SubAgentResult } from './types';
import type { Materialization } from '@doktor/tool-runtime';

export function runParallel(
  tasks: readonly SubAgentRequest[],
  materialization: Materialization,
  abortSignal?: AbortSignal,
): Effect.Effect<readonly SubAgentResult[], Error> {
  const effects = tasks.map((req) =>
    runSubAgent(req, materialization, abortSignal).pipe(
      Effect.catchAll((err) =>
        Effect.succeed({
          output: `Failed: ${err.message}`,
          toolCalls: 0,
          steps: 0,
          usage: { inputTokens: 0, outputTokens: 0 },
        } satisfies SubAgentResult),
      ),
    ),
  );

  return Effect.all(effects, { concurrency: tasks.length });
}

export function runSequential(
  tasks: readonly SubAgentRequest[],
  materialization: Materialization,
  abortSignal?: AbortSignal,
): Effect.Effect<readonly SubAgentResult[], Error> {
  return Effect.forEach(tasks, (req) =>
    runSubAgent(req, materialization, abortSignal).pipe(
      Effect.catchAll((err) =>
        Effect.succeed({
          output: `Failed: ${err.message}`,
          toolCalls: 0,
          steps: 0,
          usage: { inputTokens: 0, outputTokens: 0 },
        } satisfies SubAgentResult),
      ),
    ),
  );
}
