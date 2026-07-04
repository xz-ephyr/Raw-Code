import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const gitDiffTool: ToolDef = {
  name: 'git_diff',
  description: 'Show the diff of changes in the repository.',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    cached: z.boolean().optional().describe('Show only staged changes.'),
  }),
  execute: async ({ path, cached }) => {
    return callGoTool('git_diff', { path, cached });
  },
};
