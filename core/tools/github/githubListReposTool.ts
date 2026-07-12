import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const githubListReposTool = {
  name: 'github_list_repos',
  ...tool({
    description: 'List GitHub repositories for the authenticated user or a specified owner. Returns repo names, descriptions, stars, language, and URLs. Use when the user asks about their GitHub repos or wants to browse repositories.',
    inputSchema: zodSchema(z.object({
      owner: z.string().optional().describe('GitHub username or org to list repos for. Omit for authenticated user.'),
    })),
    execute: async ({ owner }) => {
      try {
        return await ConnectorApi.callAction('github', 'repos', { owner });
      } catch (error: any) {
        return { error: error.message || 'Failed to list GitHub repos.' };
      }
    },
  }),
};
