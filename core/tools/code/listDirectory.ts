import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const listDirectoryTool: ToolDef = {
  name: 'list_directory',
  description: 'List the contents of a directory. Returns a list of files and subdirectories with metadata.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to list.'),
    recursive: z.boolean().optional().default(false).describe('Whether to list contents recursively.'),
  }),
  execute: async ({ path, recursive }) => {
    return callGoTool('list_directory', { path, recursive });
  },
};
