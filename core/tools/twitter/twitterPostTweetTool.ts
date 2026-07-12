import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const twitterPostTweetTool = {
  name: 'twitter_post_tweet',
  ...tool({
    description: 'Post a tweet to Twitter/X. Requires text content (max 280 characters). Use when the user wants to tweet something. This is a destructive action — user confirmation may be required before posting.',
    inputSchema: zodSchema(z.object({
      text: z.string().describe('Tweet text content (max 280 characters).'),
    })),
    execute: async ({ text }) => {
      try {
        return await ConnectorApi.callAction('twitter', 'tweet', { text });
      } catch (error: any) {
        return { error: error.message || 'Failed to post tweet.' };
      }
    },
  }),
};
