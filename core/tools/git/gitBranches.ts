import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const gitBranchesTool: ToolDef = {
  name: 'git_branches',
  description: 'List local git branches with the current branch highlighted. Use to check which branch you are on before making changes.',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('git_branches', { path });
  },
};
