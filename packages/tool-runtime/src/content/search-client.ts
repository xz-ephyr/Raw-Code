/**
 * Routes web search/research through the app server's `/websearch` endpoint
 * instead of talking to a self-hosted crawler directly. The server holds the
 * real search providers (Tavily, Firecrawl, Exa, Google) with fallback +
 * caching, so this works in the browser/web view without a self-hosted backend.
 */

function apiBase(): string {
  // In the dev web view the app is served by Vite on a different port
  // (e.g. :4028) and Vite PROXIES /websearch to the API server (:3001). So we
  // must use the app origin (window.location.origin) so the request goes
  // through that proxy. Hardcoding 127.0.0.1:3001 would bypass the proxy and
  // trigger a cross-origin CORS failure. An explicit VITE_API_URL (production /
  // staging) always wins.
  const env = (import.meta as any)?.env;
  if (env?.VITE_API_URL) return env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:3001';
}

export interface ServerSearchSource {
  title: string;
  url: string;
  snippet?: string;
  content?: string;
  publishedDate?: string;
  source?: string;
}

export interface ServerSearchResult {
  results: ServerSearchSource[];
  answer?: string;
}

export async function serverWebSearch(
  query: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<ServerSearchResult> {
  const res = await fetch(`${apiBase()}/websearch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'webSearch', params: { query, maxResults } }),
    signal: signal ?? AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Search request failed (${res.status})`);
  }
  const data = await res.json();
  const results: ServerSearchSource[] = Array.isArray(data?.results) ? data.results : [];
  const answer: string | undefined = typeof data?.answer === 'string' && data.answer ? data.answer : undefined;
  if (results.length === 0 && !answer) throw new Error('No search results found');
  return { results, answer };
}

export interface ServerFetchedPage {
  content: string;
  title: string;
  url: string;
}

export async function serverFetchPage(
  url: string,
  extractAs: 'text' | 'markdown' = 'markdown',
  signal?: AbortSignal,
): Promise<ServerFetchedPage> {
  const res = await fetch(`${apiBase()}/websearch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'fetchPage', params: { url, extractAs } }),
    signal: signal ?? AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Fetch page request failed (${res.status})`);
  }
  return res.json();
}
