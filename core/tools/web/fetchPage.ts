import { z } from 'zod';
import type { ToolDef } from '../../types';
import { WebSearchService } from '../../utils/WebSearchService';

export const fetchPageTool: ToolDef = {
  name: 'fetch_page',
  description: 'Fetch and extract the full text content of a webpage from a URL. Use when you need more detail than search snippets provide.',
  category: 'web',
  inputSchema: z.object({
    url: z.string().url().describe('The full URL to fetch (must include https://).'),
    extractAs: z.enum(['markdown', 'text']).optional().default('markdown').describe('Format to extract the page content as.'),
  }),
  execute: async ({ url, extractAs }) => {
    try {
      const result = await WebSearchService.fetchPage({ url, extractAs });
      return { content: result.content, title: result.title, url: result.url };
    } catch (error: any) {
      throw new Error(error.message || 'Could not fetch the page.');
    }
  },
};
