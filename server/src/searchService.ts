import { getCache, setCache } from './search/cache';
import { redactSensitiveUrl, getConfig, requireConfig } from './search/utils';
import { tavilySearch, tavilyNewsSearch } from './search/providers/tavily';
import { firecrawlSearch, firecrawlScrape } from './search/providers/firecrawl';
import { googleSearch, googleImageSearch } from './search/providers/google';
import { exaSearch, exaNewsSearch } from './search/providers/exa';

export async function webSearch(params: { query: string; maxResults: number; site?: string }) {
  const cached = await getCache('webSearch', params);
  if (cached) return cached;

  const query = params.site ? `site:${params.site} ${params.query}` : params.query;

  // Tier 1: paid providers with rotation
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

  // Tier 1: Firecrawl (paid)
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
