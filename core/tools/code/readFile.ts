import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const readFileTool: ToolDef = {
  name: 'read_file',
  description: 'Read the entire contents of a file. ALWAYS read a file before editing it to see its current state. Use absolute paths.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to read.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('read_file', { path });
  },
};
