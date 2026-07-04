import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const fileStatsTool: ToolDef = {
  name: 'file_stats',
  description: 'Get detailed metadata and statistics for a file or directory.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file or directory.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('file_stats', { path });
  },
};
