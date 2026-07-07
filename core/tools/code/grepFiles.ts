import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const grepFilesTool: ToolDef = {
  name: 'grep_files',
  description: 'Search file CONTENTS for a regex pattern. Use to find function definitions, imports, variable usages, or any specific text within files. For filename search use find_files instead.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to search in.'),
    pattern: z.string().describe('The regex pattern to search for in file contents (e.g., "function\\s+myFunc", "import.*React").'),
    include: z.string().optional().describe('Glob pattern to filter files (e.g., "*.ts", "*.tsx"). Limits search to matching files.'),
  }),
  execute: async ({ path, pattern, include }) => {
    return callGoTool('grep_files', { path, pattern, include });
  },
};
