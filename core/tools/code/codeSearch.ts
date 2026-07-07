import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const codeSearchTool: ToolDef = {
  name: 'code_search',
  description: 'Semantic or keyword search across the codebase. Use when grep_files exact regex search is too restrictive or you need broader contextual matches. Prefer grep_files for precise pattern matching.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to search in.'),
    query: z.string().describe('The search query — keywords or phrases describing what you are looking for.'),
  }),
  execute: async ({ path, query }) => {
    return callGoTool('code_search', { path, query });
  },
};
