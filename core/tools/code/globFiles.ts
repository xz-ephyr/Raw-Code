import { z } from 'zod';
import type { ToolDef } from '../../types';
import { callGoTool } from '../../utils/goProxy';

export const globFilesTool: ToolDef = {
  name: 'glob_files',
  description: 'Expand a glob pattern into a list of matching file paths.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the base directory.'),
    pattern: z.string().describe('The glob pattern to expand.'),
  }),
  execute: async ({ path, pattern }) => {
    return callGoTool('glob_files', { path, pattern });
  },
};
