import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const listDirectoryTool: ToolDef = {
  name: 'list_directory',
  description: 'List contents of a directory with metadata. Use recursive=true sparingly — prefer find_files or glob_files for targeted searching within subdirectories.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to list.'),
    recursive: z.boolean().optional().default(false).describe('List recursively. Use only for small directory trees — prefer targeted searches for deeper navigation.'),
  }),
  execute: async ({ path, recursive }) => {
    return callGoTool('list_directory', { path, recursive });
  },
};
