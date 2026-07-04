import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const codeSearchTool: ToolDef = {
  name: 'code_search',
  description: 'Semantic or keyword search across the codebase.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to search in.'),
    query: z.string().describe('The search query.'),
  }),
  execute: async ({ path, query }) => {
    return callGoTool('code_search', { path, query });
  },
};
