import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { callGoTool } from '@core/utils/goProxy';

export const listDirectoryTool = {
  name: 'list_directory',
  ...tool({
    description: 'List contents of a directory with metadata. Use recursive=true sparingly — prefer search_codebase for targeted searching within subdirectories.',
    inputSchema: zodSchema(z.object({
      path: z.string().describe('Absolute path to the directory to list.'),
      recursive: z.boolean().optional().default(false).describe('List recursively. Use only for small directory trees — prefer targeted searches for deeper navigation.'),
    })),
    execute: async ({ path, recursive }) => {
      return callGoTool('list_directory', { path, recursive });
    },
  }),
};
