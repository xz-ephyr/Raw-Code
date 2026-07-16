import { requireConfig } from '../utils';
import { normalizeResults } from '../utils';

const EXA_URL = 'https://api.exa.ai';

export async function exaSearch(query: string, maxResults: number) {
  const apiKey = await requireConfig('search-exa-api-key', 'Exa');

  const res = await fetch(`${EXA_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      query,
      numResults: Math.min(maxResults, 10),
      type: 'auto',
      contents: { text: true, highlights: true },
    }),
  });

  if (!res.ok) throw new Error(`Exa API error (${res.status})`);
  const data = await res.json();

  return normalizeResults(data.results, 'exa', (r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: (r.highlights || []).join(' ') || (r.text || '').slice(0, 500),
    content: r.text || '',
    publishedDate: r.publishedDate || '',
  }));
}

export async function exaNewsSearch(query: string, maxResults: number, freshness: string) {
  const apiKey = await requireConfig('search-exa-api-key', 'Exa');

  const now = new Date();
  const hoursMap: Record<string, number> = { hour: 1, day: 24, week: 168, month: 720 };
  const hours = hoursMap[freshness] || 168;
  const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

  const res = await fetch(`${EXA_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      query,
      numResults: Math.min(maxResults, 10),
      type: 'auto',
      category: 'news',
      startPublishedDate: startDate,
      contents: { highlights: true },
    }),
  });

  if (!res.ok) throw new Error(`Exa News API error (${res.status})`);
  const data = await res.json();

  return normalizeResults(data.results, 'exa-news', (r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: (r.highlights || []).join(' '),
    content: '',
    publishedDate: r.publishedDate || '',
  }));
}
