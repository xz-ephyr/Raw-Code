import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const gitLogTool: ToolDef = {
  name: 'git_log',
  description: 'Show commit history. Use to review recent changes, find specific commits, or understand project history. Start with limit=5-10 to avoid overwhelming output.',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    limit: z.number().int().positive().max(100).optional().default(10).describe('Number of log entries. Start with 5-10. Max 100.'),
  }),
  execute: async ({ path, limit }) => {
    return callGoTool('git_log', { path, limit });
  },
};
