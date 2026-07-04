import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const gitStatusTool: ToolDef = {
  name: 'git_status',
  description: 'Get the current status of the git repository (staged, unstaged, untracked files).',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('git_status', { path });
  },
};
