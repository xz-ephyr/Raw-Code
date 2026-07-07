import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const editFileTool: ToolDef = {
  name: 'edit_file',
  description: 'Apply a targeted edit to an existing file by replacing an exact string match with new content. Provide the exact `old_string` to search for (include surrounding context lines for uniqueness) and the `new_string` to replace it with. Read the file first before editing.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to edit.'),
    old_string: z.string().describe('The exact string to search for and replace. Must match exactly — include surrounding context lines (a few before and after) to ensure a unique match.'),
    new_string: z.string().describe('The replacement string.'),
  }),
  execute: async ({ path, old_string, new_string }) => {
    return callGoTool('edit_file', { path, old_string, new_string }, { idempotent: false });
  },
};
