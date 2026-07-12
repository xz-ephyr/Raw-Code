import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const redditGetHotTool = {
  name: 'reddit_get_hot',
  ...tool({
    description: 'Get hot/trending posts from a Reddit subreddit. Returns post titles, scores, authors, comment counts, and URLs. Use when the user wants to see what is popular on a specific subreddit.',
    inputSchema: zodSchema(z.object({
      subreddit: z.string().describe('Subreddit name (without r/ prefix, e.g. "programming").'),
      limit: z.number().optional().default(25).describe('Number of posts to return (1-100).'),
    })),
    execute: async ({ subreddit, limit }) => {
      try {
        return await ConnectorApi.callAction('reddit', 'hot', { subreddit, limit: Math.min(limit ?? 25, 100) });
      } catch (error: any) {
        return { error: error.message || 'Failed to get Reddit hot posts.' };
      }
    },
  }),
};
