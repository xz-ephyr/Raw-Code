import { query } from '../db.js';

export function redactSensitiveUrl(text: string): string {
  return text
    .replace(/([?&]key)=[^&\s"]+/gi, '$1=REDACTED')
    .replace(/([?&]api_key)=[^&\s"]+/gi, '$1=REDACTED')
    .replace(/([?&]api-key)=[^&\s"]+/gi, '$1=REDACTED');
}

export async function getConfig(key: string): Promise<string | null> {
  const result = await query('SELECT value FROM app_config WHERE key = $1', [key]);
  return result.rows.length > 0 ? (result.rows[0] as any).value : null;
}

export async function requireConfig(key: string, label: string): Promise<string> {
  const val = await getConfig(key);
  if (!val) throw new Error(`${label} API key not configured`);
  return val;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  content: string;
  publishedDate: string;
  source: string;
}

export function normalizeResults(items: any[], source: string, mapper: (item: any) => Omit<SearchResultItem, 'source'>): { results: SearchResultItem[]; totalResults: number; answer: string } {
  return {
    results: (items || []).map((r) => ({ ...mapper(r), source })),
    totalResults: items?.length || 0,
    answer: '',
  };
}
