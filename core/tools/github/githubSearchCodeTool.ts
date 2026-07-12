import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const githubSearchCodeTool = {
  name: 'github_search_code',
  ...tool({
    description: 'Search code across GitHub repositories. Returns file paths, repo names, and matching code snippets. Use when the user wants to find code examples or search public repositories.',
    inputSchema: zodSchema(z.object({
      query: z.string().describe('Search query (supports GitHub code search syntax like language:python, repo:owner/name).'),
    })),
    execute: async ({ query }) => {
      try {
        return await ConnectorApi.callAction('github', 'search', { query });
      } catch (error: any) {
        return { error: error.message || 'Failed to search GitHub code.' };
      }
    },
  }),
};
