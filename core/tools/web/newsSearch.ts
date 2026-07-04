import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { WebSearchService } from '@core/utils/WebSearchService';

export const newsSearchTool: ToolDef = {
  name: 'news_search',
  description: 'Search for recent news articles. Use when the user asks about current events, recent developments, or time-sensitive topics.',
  category: 'web',
  inputSchema: z.object({
    query: z.string().describe('The news search query.'),
    maxResults: z.number().min(1).max(5).optional().default(5).describe('Number of news results (1–5).'),
    freshness: z.enum(['hour', 'day', 'week', 'month']).optional().default('week').describe('How recent the news should be.'),
  }),
  execute: async ({ query, maxResults, freshness }) => {
    try {
      const result = await WebSearchService.newsSearch({ query, maxResults: Math.min(maxResults ?? 5, 5), freshness });
      return {
        results: result.results.map(r => ({
          title: r.title, url: r.url, snippet: r.snippet,
          publishedDate: r.publishedDate, source: r.source,
        })),
        totalResults: result.totalResults,
      };
    } catch (error: any) {
      throw new Error(error.message || 'News search failed.');
    }
  },
};
