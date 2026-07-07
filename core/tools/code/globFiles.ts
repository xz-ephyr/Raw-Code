import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const globFilesTool: ToolDef = {
  name: 'glob_files',
  description: 'Expand a glob pattern into a list of matching file paths. Use for bulk file listing or when you need to verify which files match a pattern before operating on them.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the base directory.'),
    pattern: z.string().describe('The glob pattern to expand (e.g., "src/**/*.ts", "**/*.test.ts").'),
  }),
  execute: async ({ path, pattern }) => {
    return callGoTool('glob_files', { path, pattern });
  },
};
