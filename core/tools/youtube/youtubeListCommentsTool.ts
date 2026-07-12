import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const youtubeListCommentsTool = {
  name: 'youtube_list_comments',
  ...tool({
    description: 'List comments on a YouTube video. Returns comment text, author names, and timestamps. Use when the user wants to see comments on a specific video.',
    inputSchema: zodSchema(z.object({
      videoId: z.string().describe('YouTube video ID to fetch comments for.'),
      maxResults: z.number().optional().default(20).describe('Number of comments to return (1-50).'),
    })),
    execute: async ({ videoId, maxResults }) => {
      try {
        return await ConnectorApi.callAction('youtube', 'comments', { videoId, maxResults: Math.min(maxResults ?? 20, 50) });
      } catch (error: any) {
        return { error: error.message || 'Failed to list YouTube comments.' };
      }
    },
  }),
};
