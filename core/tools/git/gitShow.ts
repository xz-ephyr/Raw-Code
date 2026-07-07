import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const gitShowTool: ToolDef = {
  name: 'git_show',
  description: 'Show the full contents of a specific commit or git object. Use when you need to inspect exactly what changed in a commit (found via git_log).',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    revision: z.string().describe('The revision to show — commit hash (full or short), branch name, or tag. Get the hash from git_log first.'),
  }),
  execute: async ({ path, revision }) => {
    return callGoTool('git_show', { path, revision });
  },
};
