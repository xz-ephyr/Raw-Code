import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const youtubeListPlaylistsTool = {
  name: 'youtube_list_playlists',
  ...tool({
    description: 'List YouTube playlists for the authenticated user. Returns playlist titles, item counts, and thumbnails. Use when the user asks about their YouTube playlists.',
    inputSchema: zodSchema(z.object({
      maxResults: z.number().optional().default(20).describe('Number of playlists to return (1-50).'),
    })),
    execute: async ({ maxResults }) => {
      try {
        return await ConnectorApi.callAction('youtube', 'playlists', { maxResults: Math.min(maxResults ?? 20, 50) });
      } catch (error: any) {
        return { error: error.message || 'Failed to list YouTube playlists.' };
      }
    },
  }),
};
