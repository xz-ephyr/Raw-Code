import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const fileStatsTool: ToolDef = {
  name: 'file_stats',
  description: 'Get metadata for a file or directory (size, modified time, type). Use to check if a path exists or to assess file size before reading.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file or directory.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('file_stats', { path });
  },
};
