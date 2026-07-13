import type { SubAgentResult } from './types';

export function synthesize(results: readonly SubAgentResult[]): string {
  if (results.length === 0) return 'No results.';

  if (results.length === 1) return results[0].output;

  const parts = results.map(
    (r, i) => `--- Sub-task ${i + 1} ---\n${r.output}`,
  );

  return `Combined results from ${results.length} sub-tasks:\n\n${parts.join('\n\n')}`;
}
