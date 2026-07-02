import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const editFileTool: ToolDef = {
  name: 'edit_file',
  description: 'Apply targeted search-and-replace blocks to a file. Uses Git merge-style conflict markers.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to edit.'),
    diff: z.string().describe('The diff to apply in Git merge format.'),
  }),
  execute: async ({ path, diff }) => {
    return callGoTool('edit_file', { path, diff });
  },
};
