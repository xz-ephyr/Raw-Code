import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const writeFileTool: ToolDef = {
  name: 'write_file',
  description: 'Write or overwrite a file. Use for NEW files or full-file rewrites. For small targeted changes, use edit_file instead.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to write.'),
    content: z.string().describe('The full content to write to the file.'),
  }),
  execute: async ({ path, content }) => {
    return callGoTool('write_file', { path, content }, { idempotent: false });
  },
};
