import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const gitShowTool: ToolDef = {
  name: 'git_show',
  description: 'Show the contents of a specific commit or object.',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    revision: z.string().describe('The revision to show (commit hash, branch name).'),
  }),
  execute: async ({ path, revision }) => {
    return callGoTool('git_show', { path, revision });
  },
};
