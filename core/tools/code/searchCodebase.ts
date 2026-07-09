import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { callGoTool } from '@core/utils/goProxy';

export const searchCodebaseTool = {
  name: 'search_codebase',
  ...tool({
    description: 'Unified codebase search. Pass a `query` to search file contents (case-insensitive), a `pattern` to find files by name/glob, or both to search contents only within matching filenames. At least one of query or pattern is required.',
    inputSchema: zodSchema(z.object({
      query: z.string().optional().describe('Text to search for in file contents. Case-insensitive substring match. Omit for filename-only search.'),
      pattern: z.string().optional().describe('Glob pattern to match filenames (e.g. "*.ts", "src/**/*.tsx"). Omit for content-only search.'),
      path: z.string().optional().default('.').describe('Directory to search in. Defaults to project root.'),
      file_glob: z.string().optional().describe('When searching contents, limit to files matching this glob (e.g. "*.ts").'),
      max_matches: z.number().int().positive().optional().default(30).describe('Maximum results to return (1-200). Default 30.'),
    })),
    execute: async ({ query, pattern, path, file_glob, max_matches }) => {
      return callGoTool('search_codebase', { query, pattern, path, file_glob, max_matches });
    },
  }),
};
