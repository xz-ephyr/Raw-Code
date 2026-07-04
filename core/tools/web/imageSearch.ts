import { z } from 'zod';
import type { ToolDef } from '../../types';
import { WebSearchService } from '../../utils/WebSearchService';

export const imageSearchTool: ToolDef = {
  name: 'image_search',
  description: 'Search the web for images. Returns image URLs, titles, and source pages.',
  category: 'web',
  inputSchema: z.object({
    query: z.string().describe('The image search query. Descriptive terms work best.'),
    maxResults: z.number().min(1).max(5).optional().default(5).describe('Number of image results (1–5).'),
    safeSearch: z.boolean().optional().default(true).describe('Filter out explicit content.'),
  }),
  execute: async ({ query, maxResults, safeSearch }) => {
    try {
      const result = await WebSearchService.imageSearch({ query, maxResults: Math.min(maxResults ?? 5, 5), safeSearch });
      return {
        results: result.results.map(r => ({
          title: r.title, imageUrl: r.imageUrl, sourceUrl: r.sourceUrl,
          width: r.width, height: r.height,
        })),
        totalResults: result.totalResults,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Image search failed.');
    }
  },
};
