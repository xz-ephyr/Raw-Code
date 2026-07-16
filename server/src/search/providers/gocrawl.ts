import { normalizeResults } from '../utils';

function baseUrl(): string {
  return process.env.GO_CRAWL_URL || 'http://localhost:8080';
}

export async function gocrawlSearch(query: string, maxResults: number) {
  const url = `${baseUrl()}/v1/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`go-crawl search error (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(`go-crawl search failed: ${data.error}`);

  return normalizeResults(data.data, 'gocrawl', (r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: (r.markdown || '').slice(0, 300),
    content: r.markdown || r.snippet || '',
    publishedDate: '',
  }));
}

export async function gocrawlScrape(url: string, formats: string[]) {
  const res = await fetch(`${baseUrl()}/v1/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ url, formats }),
  });

  if (!res.ok) throw new Error(`go-crawl scrape error (${res.status})`);

  const data = await res.json();
  if (!data.success) throw new Error(`go-crawl scrape failed: ${data.error}`);
  return data.data || null;
}

export async function gocrawlCrawl(url: string, maxDepth?: number, maxPages?: number) {
  const res = await fetch(`${baseUrl()}/v1/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ url, maxDepth, maxPages }),
  });

  if (!res.ok) throw new Error(`go-crawl crawl error (${res.status})`);

  const data = await res.json();
  if (!data.success) throw new Error(`go-crawl crawl failed: ${data.error}`);
  return data as { success: boolean; id: string };
}

export async function gocrawlCrawlStatus(id: string) {
  const res = await fetch(`${baseUrl()}/v1/crawl/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`go-crawl crawl status error (${res.status})`);

  const data = await res.json();
  if (!data.success) throw new Error(`go-crawl crawl status failed: ${data.error}`);
  return data as {
    success: boolean; id: string; status: string;
    pages?: any[]; stats?: any; error?: string;
  };
}

export async function gocrawlMap(url: string) {
  const res = await fetch(`${baseUrl()}/v1/map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error(`go-crawl map error (${res.status})`);

  const data = await res.json();
  if (!data.success) throw new Error(`go-crawl map failed: ${data.error}`);
  return data as { success: boolean; links: string[] };
}

export async function gocrawlExtractStructured(url: string, selectors: Record<string, string>) {
  const res = await fetch(`${baseUrl()}/v1/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ url, selectors }),
  });
  if (!res.ok) throw new Error(`go-crawl extract error (${res.status})`);
  const data = await res.json();
  if (!data.success) throw new Error(`go-crawl extract failed: ${data.error}`);
  return data as { success: boolean; data: Record<string, string[]> };
}

export async function gocrawlExtractImages(url: string) {
  const res = await fetch(`${baseUrl()}/v1/extract/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`go-crawl extract images error (${res.status})`);
  const data = await res.json();
  if (!data.success) throw new Error(`go-crawl extract images failed: ${data.error}`);
  return data as { success: boolean; images: any[] };
}

export async function gocrawlExportCrawl(id: string, format?: string) {
  const fmt = format || 'json';
  const res = await fetch(`${baseUrl()}/v1/crawl/${encodeURIComponent(id)}/export?format=${fmt}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`go-crawl export error (${res.status})`);
  if (fmt === 'markdown') {
    return { format: 'markdown' as const, content: await res.text() };
  }
  return { format: 'json' as const, data: await res.json() };
}

export async function gocrawlExtractVideos(url: string) {
  const res = await fetch(`${baseUrl()}/v1/extract/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error(`go-crawl extract videos error (${res.status})`);

  const data = await res.json();
  if (!data.success) throw new Error(`go-crawl extract videos failed: ${data.error}`);
  return data as { success: boolean; videos: any[] };
}
