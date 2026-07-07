import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const gitStatusTool: ToolDef = {
  name: 'git_status',
  description: 'Check git status — always call this FIRST before any git operation to understand the current state: staged, unstaged, and untracked files.',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('git_status', { path });
  },
};
