import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const twitterSearchTweetsTool = {
  name: 'twitter_search_tweets',
  ...tool({
    description: 'Search recent tweets on Twitter/X by query. Returns matching tweets with text, author, and engagement metrics. Use when the user wants to find tweets about a specific topic.',
    inputSchema: zodSchema(z.object({
      query: z.string().describe('Search query (supports standard Twitter search operators).'),
      maxResults: z.number().optional().default(10).describe('Number of results (1-100).'),
    })),
    execute: async ({ query, maxResults }) => {
      try {
        return await ConnectorApi.callAction('twitter', 'search', { query, maxResults: Math.min(maxResults ?? 10, 100) });
      } catch (error: any) {
        return { error: error.message || 'Failed to search tweets.' };
      }
    },
  }),
};
