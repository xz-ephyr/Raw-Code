import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { WebSearchService } from '@core/utils/WebSearchService';

export const webSearchTool = {
  name: 'web_search',
  ...tool({
    description: 'Search the web for current information. Use when you need up-to-date data, recent news, documentation, or facts beyond your training cutoff. ONE domain per search.',
    inputSchema: zodSchema(z.object({
      query: z.string().describe('The search query. Be specific and concise. Supports site:example.com to limit to ONE domain. Do NOT include multiple site: operators.'),
      site: z.string().optional().describe('Limit search to a single domain only (e.g. "react.dev"). ONE domain per search call — do not pass multiple domains.'),
      maxResults: z.number().optional().default(10).describe('Number of results (1–10). Hard cap: 10 per search.'),
    })),
    execute: async ({ query, site, maxResults }) => {
      try {
        const result = await WebSearchService.search({ query, site, maxResults: Math.min(maxResults ?? 10, 10) });
        return {
          results: result.results.map(r => ({
            title: r.title, url: r.url, snippet: r.snippet,
            content: r.content, publishedDate: r.publishedDate, source: r.source,
          })),
          totalResults: result.totalResults,
          answer: result.answer,
        };
      } catch (error: any) {
        return { error: error.message || 'Search request failed.' };
      }
    },
  }),
};
