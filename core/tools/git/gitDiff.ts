import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const gitDiffTool: ToolDef = {
  name: 'git_diff',
  description: 'Show file diffs in the repository. Use after git_status to inspect what changed. Omit cached for unstaged changes; set cached=true for staged (index) changes only.',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    cached: z.boolean().optional().describe('Show only staged changes. Omit or set false for unstaged changes.'),
  }),
  execute: async ({ path, cached }) => {
    return callGoTool('git_diff', { path, cached });
  },
};
