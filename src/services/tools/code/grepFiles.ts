import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const grepFilesTool: ToolDef = {
  name: 'grep_files',
  description: 'Search for a regex pattern in the contents of multiple files within a directory.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to search in.'),
    pattern: z.string().describe('The regex pattern to search for in file contents.'),
    include: z.string().optional().describe('Glob pattern for files to include.'),
  }),
  execute: async ({ path, pattern, include }) => {
    return callGoTool('grep_files', { path, pattern, include });
  },
};
