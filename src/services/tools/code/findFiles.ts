import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const findFilesTool: ToolDef = {
  name: 'find_files',
  description: 'Search for files matching a specific pattern (glob) within a directory.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to search in.'),
    pattern: z.string().describe('Glob pattern to match filenames (e.g., "*.ts", "**/src/*.tsx").'),
  }),
  execute: async ({ path, pattern }) => {
    return callGoTool('find_files', { path, pattern });
  },
};
