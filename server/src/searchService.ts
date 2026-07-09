import crypto from 'crypto';
import { query } from './db.js';

function redactSensitiveUrl(text: string): string {
  return text
    .replace(/([?&]key)=[^&\s"]+/gi, '$1=REDACTED')
    .replace(/([?&]api_key)=[^&\s"]+/gi, '$1=REDACTED')
    .replace(/([?&]api-key)=[^&\s"]+/gi, '$1=REDACTED');
}

const TAVILY_URL = 'https://api.tavily.com';
const FIRECRAWL_URL = 'https://api.firecrawl.dev';
const GOOGLE_URL = 'https://www.googleapis.com/customsearch/v1';
const EXA_URL = 'https://api.exa.ai';

const TTL: Record<string, number> = {
  webSearch: 5 * 60 * 1000,
  imageSearch: 10 * 60 * 1000,
  newsSearch: 2 * 60 * 1000,
  fetchPage: 30 * 60 * 1000,
};

function cacheKey(tool: string, params: any): string {
  return crypto.createHash('sha256').update(`${tool}:${JSON.stringify(params)}`).digest('hex');
}

async function getCache(tool: string, params: any): Promise<any | null> {
  const key = cacheKey(tool, params);
  const result = await query('SELECT results, created_at FROM search_cache WHERE cache_key = $1', [key]);
  if (result.rows.length > 0) {
    const row = result.rows[0] as any;
    const age = Date.now() - Number(row.created_at);
    if (age < (TTL[tool] || 300000)) {
      return JSON.parse(row.results);
    }
  }
  return null;
}

async function setCache(tool: string, params: any, provider: string, results: any): Promise<void> {
  const key = cacheKey(tool, params);
  await query(
    `INSERT INTO search_cache (cache_key, provider, tool, results, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (cache_key) DO UPDATE SET results = EXCLUDED.results, created_at = EXCLUDED.created_at`,
    [key, provider, tool, JSON.stringify(results), Date.now()]
  );
}

async function getConfig(key: string): Promise<string | null> {
  const result = await query('SELECT value FROM app_config WHERE key = $1', [key]);
  return result.rows.length > 0 ? (result.rows[0] as any).value : null;
}

async function tavilySearch(query: string, maxResults: number, searchDepth = 'basic', topic?: string) {
  const apiKey = await getConfig('search-api-key');
  if (!apiKey) throw new Error('Tavily API key not configured');

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
  return {
    results: (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: (r.content || '').slice(0, 500),
      content: r.content || '',
      publishedDate: r.published_date || '',
      source: 'tavily',
    })),
    totalResults: data.results?.length || 0,
    answer: data.answer || '',
  };
}

async function firecrawlSearch(query: string, maxResults: number) {
  const apiKey = await getConfig('search-firecrawl-api-key');
  if (!apiKey) throw new Error('Firecrawl API key not configured');

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
  return {
    results: (data.data || []).map((r: any) => ({
      title: r.metadata?.title || '',
      url: r.url || r.metadata?.sourceURL || '',
      snippet: r.metadata?.description || '',
      content: r.markdown || '',
      publishedDate: '',
      source: 'firecrawl',
    })),
    totalResults: data.data?.length || 0,
    answer: '',
  };
}

async function firecrawlScrape(url: string, formats: string[]) {
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



async function googleSearch(query: string, maxResults: number) {
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
    results: (data.items || []).map((r: any) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
      content: '',
      publishedDate: '',
      source: 'google',
    })),
    totalResults: Number(data.searchInformation?.totalResults) || 0,
    answer: '',
  };
}

async function exaSearch(query: string, maxResults: number) {
  const apiKey = await getConfig('search-exa-api-key');
  if (!apiKey) throw new Error('Exa API key not configured');

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

  return {
    results: (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: (r.highlights || []).join(' ') || (r.text || '').slice(0, 500),
      content: r.text || '',
      publishedDate: r.publishedDate || '',
      source: 'exa',
    })),
    totalResults: data.results?.length || 0,
    answer: '',
  };
}

async function exaNewsSearch(query: string, maxResults: number, freshness: string) {
  const apiKey = await getConfig('search-exa-api-key');
  if (!apiKey) throw new Error('Exa API key not configured');

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

  return {
    results: (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: (r.highlights || []).join(' '),
      content: '',
      publishedDate: r.publishedDate || '',
      source: 'exa-news',
    })),
    totalResults: data.results?.length || 0,
    answer: '',
  };
}

export async function webSearch(params: { query: string; maxResults: number; site?: string }) {
  const cached = await getCache('webSearch', params);
  if (cached) return cached;

  const query = params.site ? `site:${params.site} ${params.query}` : params.query;

  // Gather all configured providers
  const providerConfigs: Array<{ name: string; key: string; extra?: string }> = [];
  const tavilyKey = await getConfig('search-api-key');
  if (tavilyKey) providerConfigs.push({ name: 'tavily', key: tavilyKey });
  const firecrawlKey = await getConfig('search-firecrawl-api-key');
  if (firecrawlKey) providerConfigs.push({ name: 'firecrawl', key: firecrawlKey });
  const exaKey = await getConfig('search-exa-api-key');
  if (exaKey) providerConfigs.push({ name: 'exa', key: exaKey });
  const googleKey = await getConfig('search-google-api-key');
  const googleCx = await getConfig('search-google-cx');
  if (googleKey && googleCx) providerConfigs.push({ name: 'google', key: googleKey, extra: googleCx });

  // Shuffle for rotation
  for (let i = providerConfigs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [providerConfigs[i], providerConfigs[j]] = [providerConfigs[j], providerConfigs[i]];
  }

  let result: any;
  let lastError: any;

  for (const cfg of providerConfigs) {
    try {
      switch (cfg.name) {
        case 'tavily':
          result = await tavilySearch(query, params.maxResults);
          break;
        case 'firecrawl':
          result = await firecrawlSearch(query, params.maxResults);
          break;
        case 'exa':
          result = await exaSearch(query, params.maxResults);
          break;
        case 'google':
          result = await googleSearch(query, params.maxResults);
          break;
      }
      await setCache('webSearch', params, cfg.name, result);
      return result;
    } catch (e) {
      lastError = e;
      console.warn(`Search provider "${cfg.name}" failed, trying next: ${redactSensitiveUrl((e as any).message)}`);
    }
  }

  throw lastError || new Error('All search providers failed');
}

export async function fetchPage(params: { url: string; extractAs: string }) {
  const cached = await getCache('fetchPage', params);
  if (cached) return cached;

  let result;

  try {
    const firecrawlKey = await getConfig('search-firecrawl-api-key');
    if (firecrawlKey) {
      const data = await firecrawlScrape(params.url, [params.extractAs === 'text' ? 'text' : 'markdown']);
      if (data) {
        result = {
          content: data.markdown || data.text || '',
          title: data.metadata?.title || '',
          url: params.url,
        };
        await setCache('fetchPage', params, 'firecrawl', result);
        return result;
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await fetch(params.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; XZ/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    result = {
      content: text.slice(0, 50000),
      title,
      url: params.url,
    };
  } catch (error: any) {
    throw new Error(`Could not fetch the page. The URL may be invalid or blocked: ${error.message}`);
  }

  await setCache('fetchPage', params, 'fallback', result);
  return result;
}

async function googleImageSearch(query: string, maxResults: number, safeSearch: boolean) {
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

async function tavilyNewsSearch(query: string, maxResults: number, freshness: string) {
  const apiKey = await getConfig('search-api-key');
  if (!apiKey) throw new Error('Tavily API key not configured');

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
  return {
    results: (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: (r.content || '').slice(0, 500),
      content: r.content || '',
      publishedDate: r.published_date || '',
      source: 'tavily-news',
    })),
    totalResults: data.results?.length || 0,
    answer: data.answer || '',
  };
}

export async function imageSearch(params: { query: string; maxResults: number; safeSearch: boolean }) {
  const cached = await getCache('imageSearch', params);
  if (cached) return cached;

  const result = await googleImageSearch(params.query, params.maxResults, params.safeSearch);
  await setCache('imageSearch', params, 'google', result);
  return result;
}

export async function newsSearch(params: { query: string; maxResults: number; freshness: string }) {
  const cached = await getCache('newsSearch', params);
  if (cached) return cached;

  let result;
  let provider = '';

  const exaKey = await getConfig('search-exa-api-key');
  if (exaKey) {
    try {
      result = await exaNewsSearch(params.query, params.maxResults, params.freshness);
      provider = 'exa';
    } catch {
      /* fall through to Tavily */
    }
  }

  if (!result) {
    result = await tavilyNewsSearch(params.query, params.maxResults, params.freshness);
    provider = 'tavily';
  }

  await setCache('newsSearch', params, provider, result);
  return result;
}

export async function cleanupExpiredCache() {
  const now = Date.now();
  for (const [tool, ttl] of Object.entries(TTL)) {
    await query('DELETE FROM search_cache WHERE tool = $1 AND created_at < $2', [tool, now - ttl]);
  }
}
