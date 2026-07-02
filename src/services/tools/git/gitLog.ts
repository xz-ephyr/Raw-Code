import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const gitLogTool: ToolDef = {
  name: 'git_log',
  description: 'Show the commit history log.',
  category: 'git',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    limit: z.number().optional().default(10).describe('Limit the number of log entries.'),
  }),
  execute: async ({ path, limit }) => {
    return callGoTool('git_log', { path, limit });
  },
};
