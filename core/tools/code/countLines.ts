import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const countLinesTool: ToolDef = {
  name: 'count_lines',
  description: 'Count total lines of code in a directory, grouped by language. Use for project size estimation or to understand codebase scale. Not for finding specific files or patterns.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to analyze.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('count_lines', { path });
  },
};
