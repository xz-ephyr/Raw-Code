import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { callGoTool } from '@core/utils/goProxy';

export const writeFileTool = {
  name: 'write_file',
  ...tool({
    description: 'Write or overwrite a file. Use for NEW files or full-file rewrites. For small targeted changes, use edit_file instead.',
    inputSchema: zodSchema(z.object({
      path: z.string().describe('Absolute path to the file to write.'),
      content: z.string().describe('The full content to write to the file.'),
    })),
    execute: async ({ path, content }) => {
      return callGoTool('write_file', { path, content }, { idempotent: false });
    },
  }),
};
