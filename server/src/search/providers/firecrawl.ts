import { requireConfig, getConfig } from '../utils';
import { normalizeResults } from '../utils';

const FIRECRAWL_URL = 'https://api.firecrawl.dev';

export async function firecrawlSearch(query: string, maxResults: number) {
  const apiKey = await requireConfig('search-firecrawl-api-key', 'Firecrawl');

  const res = await fetch(`${FIRECRAWL_URL}/v1/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      query,
      limit: Math.min(maxResults, 10),
      scrapeOptions: { formats: ['markdown'] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firecrawl API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return normalizeResults(data.data, 'firecrawl', (r: any) => ({
    title: r.metadata?.title || '',
    url: r.url || r.metadata?.sourceURL || '',
    snippet: r.metadata?.description || '',
    content: r.markdown || '',
    publishedDate: '',
  }));
}

export async function firecrawlScrape(url: string, formats: string[]) {
  const apiKey = await getConfig('search-firecrawl-api-key');
  if (!apiKey) throw new Error('Firecrawl API key not configured');

  const res = await fetch(`${FIRECRAWL_URL}/v1/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ url, formats }),
  });

  if (!res.ok) throw new Error(`Firecrawl scrape error (${res.status})`);
  const data = await res.json();
  return data.data || null;
}
