import { z } from 'zod';
import type { ToolDef } from '../../types';
import { WebSearchService } from '../../utils/WebSearchService';

export const webSearchTool: ToolDef = {
  name: 'web_search',
  description: 'Search the web for current information. Use when you need up-to-date data, recent news, documentation, or facts beyond your training cutoff.',
  category: 'web',
  inputSchema: z.object({
    query: z.string().describe('The search query. Be specific and concise. Supports site:example.com to limit to one domain.'),
    site: z.string().optional().describe('Limit search to a single domain only (e.g. "react.dev").'),
    maxResults: z.number().min(1).max(5).optional().default(5).describe('Number of results (1–5).'),
  }),
  execute: async ({ query, site, maxResults }) => {
    try {
      const result = await WebSearchService.search({ query, site, maxResults: Math.min(maxResults ?? 5, 5) });
      return {
        results: result.results.map(r => ({
          title: r.title, url: r.url, snippet: r.snippet,
          content: r.content, publishedDate: r.publishedDate, source: r.source,
        })),
        totalResults: result.totalResults,
        answer: result.answer,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Search request failed.');
    }
  },
};
