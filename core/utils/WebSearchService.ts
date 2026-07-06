const API_BASE = () => import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  publishedDate?: string;
  source?: string;
}

interface ImageResult {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}

interface WebSearchResponse {
  results: WebSearchResult[];
  totalResults: number;
  answer?: string;
}

interface ImageSearchResponse {
  results: ImageResult[];
  totalResults: number;
}

interface FetchPageResponse {
  content: string;
  title: string;
  url: string;
}

async function callServer(tool: string, params: any): Promise<any> {
  const res = await fetch(`${API_BASE()}/websearch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Search request failed (${res.status})`);
  }
  return res.json();
}

export const WebSearchService = {
  async search(params: { query: string; maxResults?: number; site?: string }): Promise<WebSearchResponse> {
    return callServer('webSearch', {
      query: params.query,
      maxResults: Math.min(params.maxResults ?? 10, 10),
      site: params.site,
    });
  },

  async fetchPage(params: { url: string; extractAs?: 'markdown' | 'text' }): Promise<FetchPageResponse> {
    return callServer('fetchPage', {
      url: params.url,
      extractAs: params.extractAs ?? 'markdown',
    });
  },

  async imageSearch(params: { query: string; maxResults?: number; safeSearch?: boolean }): Promise<ImageSearchResponse> {
    return callServer('imageSearch', {
      query: params.query,
      maxResults: Math.min(params.maxResults ?? 10, 10),
      safeSearch: params.safeSearch ?? true,
    });
  },

  async newsSearch(params: { query: string; maxResults?: number; freshness?: string }): Promise<WebSearchResponse> {
    return callServer('newsSearch', {
      query: params.query,
      maxResults: Math.min(params.maxResults ?? 10, 10),
      freshness: params.freshness ?? 'week',
    });
  },
};
