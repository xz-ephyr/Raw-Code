import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const githubListPRsTool = {
  name: 'github_list_prs',
  ...tool({
    description: 'List open GitHub pull requests for a given repository. Returns PR titles, numbers, authors, and status. Use when the user asks about open PRs in a repo.',
    inputSchema: zodSchema(z.object({
      owner: z.string().describe('GitHub repository owner (user or org).'),
      repo: z.string().describe('Repository name.'),
    })),
    execute: async ({ owner, repo }) => {
      try {
        return await ConnectorApi.callAction('github', 'prs', { owner, repo });
      } catch (error: any) {
        return { error: error.message || 'Failed to list GitHub PRs.' };
      }
    },
  }),
};
