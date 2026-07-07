import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const editFileTool: ToolDef = {
  name: 'edit_file',
  description: 'Make a targeted edit to a file using search-and-replace. Provide surrounding context (a few lines before and after) to ensure unique matches. Format: <<<<<<< SEARCH\\nexact text to replace\\n=======\\nreplacement text\\n>>>>>>> REPLACE. Read the file first before editing.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to edit.'),
    diff: z.string().describe('The diff in Git merge-conflict format: <<<<<<< SEARCH\\n<exact lines to replace>\\n=======\\n<new lines>\\n>>>>>>> REPLACE'),
  }),
  execute: async ({ path, diff }) => {
    return callGoTool('edit_file', { path, diff }, { idempotent: false });
  },
};
