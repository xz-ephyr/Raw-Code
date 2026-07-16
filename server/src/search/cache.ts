import crypto from 'crypto';
import { query } from '../db.js';

const TTL: Record<string, number> = {
  webSearch: 5 * 60 * 1000,
  imageSearch: 10 * 60 * 1000,
  newsSearch: 2 * 60 * 1000,
  fetchPage: 30 * 60 * 1000,
};

function cacheKey(tool: string, params: any): string {
  return crypto.createHash('sha256').update(`${tool}:${JSON.stringify(params)}`).digest('hex');
}

export async function getCache(tool: string, params: any): Promise<any | null> {
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

export async function setCache(tool: string, params: any, provider: string, results: any): Promise<void> {
  const key = cacheKey(tool, params);
  await query(
    `INSERT INTO search_cache (cache_key, provider, tool, results, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (cache_key) DO UPDATE SET results = EXCLUDED.results, created_at = EXCLUDED.created_at`,
    [key, provider, tool, JSON.stringify(results), Date.now()]
  );
}
