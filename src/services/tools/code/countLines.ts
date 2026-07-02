import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const countLinesTool: ToolDef = {
  name: 'count_lines',
  description: 'Count total lines of code in a directory, grouped by language.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to analyze.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('count_lines', { path });
  },
};
