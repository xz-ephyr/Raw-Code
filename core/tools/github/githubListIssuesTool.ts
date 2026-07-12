import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const githubListIssuesTool = {
  name: 'github_list_issues',
  ...tool({
    description: 'List open GitHub issues for a given repository. Returns issue titles, numbers, labels, assignees, and status. Use when the user wants to see issues for a specific repo.',
    inputSchema: zodSchema(z.object({
      owner: z.string().describe('GitHub repository owner (user or org).'),
      repo: z.string().describe('Repository name.'),
    })),
    execute: async ({ owner, repo }) => {
      try {
        return await ConnectorApi.callAction('github', 'issues', { owner, repo });
      } catch (error: any) {
        return { error: error.message || 'Failed to list GitHub issues.' };
      }
    },
  }),
};
