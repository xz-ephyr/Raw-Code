import { z } from 'zod';
import type { ToolDef } from '../../types';
import { callGoTool } from '../../utils/goProxy';

export const gitBranchesTool: ToolDef = {
  name: 'git_branches',
  description: 'List local branches in the git repository.',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('git_branches', { path });
  },
};
