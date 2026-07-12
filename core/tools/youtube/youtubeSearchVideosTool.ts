import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const youtubeSearchVideosTool = {
  name: 'youtube_search_videos',
  ...tool({
    description: 'Search YouTube videos by query. Returns video titles, descriptions, channel names, publish dates, and thumbnails. Use when the user wants to find videos on YouTube.',
    inputSchema: zodSchema(z.object({
      query: z.string().describe('Search query for YouTube videos.'),
      maxResults: z.number().optional().default(10).describe('Number of results (1-50).'),
    })),
    execute: async ({ query, maxResults }) => {
      try {
        return await ConnectorApi.callAction('youtube', 'search', { query, maxResults: Math.min(maxResults ?? 10, 50) });
      } catch (error: any) {
        return { error: error.message || 'Failed to search YouTube.' };
      }
    },
  }),
};
