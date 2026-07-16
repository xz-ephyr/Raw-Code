import { getConfig } from '../utils';
import { normalizeResults } from '../utils';

const GOOGLE_URL = 'https://www.googleapis.com/customsearch/v1';

export async function googleSearch(query: string, maxResults: number) {
  const apiKey = await getConfig('search-google-api-key');
  const cx = await getConfig('search-google-cx');
  if (!apiKey || !cx) throw new Error('Google Custom Search not configured');

  const res = await fetch(
    `${GOOGLE_URL}?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!res.ok) throw new Error(`Google API error (${res.status})`);
  const data = await res.json();

  return {
    ...normalizeResults(data.items, 'google', (r: any) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
      content: '',
      publishedDate: '',
    })),
    totalResults: Number(data.searchInformation?.totalResults) || 0,
  };
}

export async function googleImageSearch(query: string, maxResults: number, safeSearch: boolean) {
  const apiKey = await getConfig('search-google-api-key');
  const cx = await getConfig('search-google-cx');
  if (!apiKey || !cx) throw new Error('Google Custom Search not configured');

  const safe = safeSearch ? '&safe=active' : '';
  const res = await fetch(
    `${GOOGLE_URL}?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}&searchType=image${safe}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!res.ok) throw new Error(`Google Image API error (${res.status})`);
  const data = await res.json();

  return {
    results: (data.items || []).map((r: any) => ({
      title: r.title || '',
      imageUrl: r.link || '',
      sourceUrl: r.image?.contextLink || '',
      width: r.image?.width || 0,
      height: r.image?.height || 0,
    })),
    totalResults: Number(data.searchInformation?.totalResults) || 0,
  };
}
