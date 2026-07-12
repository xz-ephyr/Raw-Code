import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const redditSearchPostsTool = {
  name: 'reddit_search_posts',
  ...tool({
    description: 'Search Reddit posts by query, optionally within a specific subreddit. Returns matching post titles, scores, authors, and URLs. Use when the user wants to find Reddit discussions on a topic.',
    inputSchema: zodSchema(z.object({
      query: z.string().describe('Search query for finding Reddit posts.'),
      subreddit: z.string().optional().describe('Restrict search to this subreddit (without r/ prefix).'),
      limit: z.number().optional().default(25).describe('Number of results (1-100).'),
    })),
    execute: async ({ query, subreddit, limit }) => {
      try {
        return await ConnectorApi.callAction('reddit', 'search', { query, subreddit, limit: Math.min(limit ?? 25, 100) });
      } catch (error: any) {
        return { error: error.message || 'Failed to search Reddit.' };
      }
    },
  }),
};
