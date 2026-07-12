import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const redditSubmitPostTool = {
  name: 'reddit_submit_post',
  ...tool({
    description: 'Submit a text post to a Reddit subreddit. Requires subreddit name, title, and body text. Use when the user wants to create a new Reddit post. This is a destructive action — user confirmation may be required.',
    inputSchema: zodSchema(z.object({
      subreddit: z.string().describe('Subreddit to post in (without r/ prefix).'),
      title: z.string().describe('Post title.'),
      text: z.string().describe('Post body text (self-post content).'),
    })),
    execute: async ({ subreddit, title, text }) => {
      try {
        return await ConnectorApi.callAction('reddit', 'submit', { subreddit, title, text });
      } catch (error: any) {
        return { error: error.message || 'Failed to submit Reddit post.' };
      }
    },
  }),
};
