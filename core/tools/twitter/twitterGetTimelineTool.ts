import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const twitterGetTimelineTool = {
  name: 'twitter_get_timeline',
  ...tool({
    description: 'Get the authenticated user\'s Twitter timeline (reverse chronological). Returns tweets with text, author, likes, retweets, and timestamps. Use when the user asks about their Twitter feed or recent tweets.',
    inputSchema: zodSchema(z.object({
      maxResults: z.number().optional().default(20).describe('Number of tweets to return (1-100).'),
    })),
    execute: async ({ maxResults }) => {
      try {
        return await ConnectorApi.callAction('twitter', 'timeline', { maxResults: Math.min(maxResults ?? 20, 100) });
      } catch (error: any) {
        return { error: error.message || 'Failed to get Twitter timeline.' };
      }
    },
  }),
};
