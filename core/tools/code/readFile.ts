import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { callGoTool } from '@core/utils/goProxy';

export const readFileTool = {
  name: 'read_file',
  ...tool({
    description: 'Read the entire contents of a file. ALWAYS read a file before editing it to see its current state. Use absolute paths.',
    inputSchema: zodSchema(z.object({
      path: z.string().describe('Absolute path to the file to read.'),
    })),
    execute: async ({ path }: { path: string }) => {
      return callGoTool('read_file', { path });
    },
  }),
};
