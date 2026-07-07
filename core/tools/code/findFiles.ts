import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const findFilesTool: ToolDef = {
  name: 'find_files',
  description: 'Search for files by name pattern (glob). Use when you know the filename, extension, or naming convention. For content search use grep_files instead.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to search in.'),
    pattern: z.string().describe('Glob pattern to match filenames (e.g., "*.ts", "**/src/*.tsx").'),
  }),
  execute: async ({ path, pattern }) => {
    return callGoTool('find_files', { path, pattern });
  },
};
