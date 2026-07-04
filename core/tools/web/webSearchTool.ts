import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { WebSearchService } from '../../utils/WebSearchService';

export const webSearchTool = tool({
  description: 'Search the web for current information. Use when you need up-to-date data, recent news, documentation, or facts beyond your training cutoff. ONE domain per search.',
  inputSchema: zodSchema(z.object({
    query: z.string().describe('The search query. Be specific and concise. Supports site:example.com to limit to ONE domain. Do NOT include multiple site: operators.'),
    site: z.string().optional().describe('Limit search to a single domain only (e.g. "react.dev"). ONE domain per search call — do not pass multiple domains.'),
    maxResults: z.number().optional().default(5).describe('Number of results (1–5). Hard cap: 5 per search.'),
  })),
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
      return { error: error.message || 'Search request failed.' };
    }
  },
});

export const fetchPageTool = tool({
  description: 'Fetch and extract the full text content of a webpage from a URL. Use when you need more detail than search snippets provide — documentation pages, blog posts, articles, etc.',
  inputSchema: zodSchema(z.object({
    url: z.string().describe('The full URL to fetch (must include https://).'),
    extractAs: z.enum(['markdown', 'text']).optional().default('markdown').describe('Format to extract the page content as.'),
  })),
  execute: async ({ url, extractAs }) => {
    try {
      const result = await WebSearchService.fetchPage({ url, extractAs });
      return { content: result.content, title: result.title, url: result.url };
    } catch (error: any) {
      return { error: error.message || 'Could not fetch the page.' };
    }
  },
});

export const imageSearchTool = tool({
  description: 'Search the web for images. Returns image URLs, titles, and source pages. Use when the user wants to find pictures, screenshots, diagrams, logos, or visual references.',
  inputSchema: zodSchema(z.object({
    query: z.string().describe('The image search query. Descriptive terms work best.'),
    maxResults: z.number().optional().default(5).describe('Number of image results (1–5). Hard cap: 5 per search.'),
    safeSearch: z.boolean().optional().default(true).describe('Filter out explicit content.'),
  })),
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
      return { error: error.message || 'Image search failed.' };
    }
  },
});

export const newsSearchTool = tool({
  description: 'Search for recent news articles. Use when the user asks about current events, recent developments, or time-sensitive topics.',
  inputSchema: zodSchema(z.object({
    query: z.string().describe('The news search query.'),
    maxResults: z.number().optional().default(5).describe('Number of news results (1–5). Hard cap: 5 per search.'),
    freshness: z.enum(['hour', 'day', 'week', 'month']).optional().default('week').describe('How recent the news should be.'),
  })),
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
      return { error: error.message || 'News search failed.' };
    }
  },
});
