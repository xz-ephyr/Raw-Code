import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const twitterGetUserTool = {
  name: 'twitter_get_user',
  ...tool({
    description: 'Get a Twitter/X user profile by username. Returns display name, bio, follower count, following count, and recent tweets. Use when the user asks about a specific Twitter profile.',
    inputSchema: zodSchema(z.object({
      username: z.string().describe('Twitter username (without @ symbol).'),
    })),
    execute: async ({ username }) => {
      try {
        return await ConnectorApi.callAction('twitter', 'user', { username });
      } catch (error: any) {
        return { error: error.message || 'Failed to get Twitter user.' };
      }
    },
  }),
};
