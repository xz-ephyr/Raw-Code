import { requireConfig } from '../utils';
import { normalizeResults } from '../utils';

const TAVILY_URL = 'https://api.tavily.com';

export async function tavilySearch(query: string, maxResults: number, searchDepth = 'basic', topic?: string) {
  const apiKey = await requireConfig('search-api-key', 'Tavily');

  const res = await fetch(`${TAVILY_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      max_results: Math.min(maxResults, 10),
      include_answer: true,
      include_raw_content: false,
      ...(topic ? { topic } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tavily API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const results = normalizeResults(data.results, 'tavily', (r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: (r.content || '').slice(0, 500),
    content: r.content || '',
    publishedDate: r.published_date || '',
  }));
  results.answer = data.answer || '';
  return results;
}

export async function tavilyNewsSearch(query: string, maxResults: number, freshness: string) {
  const apiKey = await requireConfig('search-api-key', 'Tavily');

  const freshnessMap: Record<string, string> = {
    hour: '1h',
    day: '1d',
    week: '1w',
    month: '1m',
  };

  const res = await fetch(`${TAVILY_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: Math.min(maxResults, 10),
      include_answer: true,
      include_raw_content: false,
      topic: 'news',
      days: freshnessMap[freshness] || '1w',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tavily API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const results = normalizeResults(data.results, 'tavily-news', (r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: (r.content || '').slice(0, 500),
    content: r.content || '',
    publishedDate: r.published_date || '',
  }));
  results.answer = data.answer || '';
  return results;
}
