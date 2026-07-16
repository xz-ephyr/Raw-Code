import { DatabaseService } from '@core/utils/DatabaseService';
import { getAllProviders, getProviderClient } from '@core/providers';

type ProviderClient = any;

const CACHE_TTL = 5_000;

interface ProvidersCacheEntry {
  clients: Map<string, ProviderClient>;
  keys: Record<string, string>;
  baseURLOverrides: Record<string, string>;
  timestamp: number;
}

const providersCache = new Map<string, ProvidersCacheEntry>();
const GLOBAL_CACHE_KEY = '__global__';

export function refreshProviders(cacheKey?: string) {
  if (cacheKey) {
    providersCache.delete(cacheKey);
  } else {
    providersCache.clear();
  }
}

export async function getProviders(projectId?: string) {
  const cacheKey = projectId || GLOBAL_CACHE_KEY;
  const existing = providersCache.get(cacheKey);
  if (existing && Date.now() - existing.timestamp < CACHE_TTL) {
    return existing.clients;
  }

  const allProviders = getAllProviders();

  const keyPromises = allProviders.map(async (p) => {
    const key = await DatabaseService.getConfig(p.configKey)
      .then(r => r || localStorage.getItem(p.configKey) || '');
    return { id: p.id, key };
  });

  const baseURLPromises = allProviders
    .map(async (p) => {
      const baseURLKey = `${p.id}-base-url`;
      const baseURL = await DatabaseService.getConfig(baseURLKey)
        .then(r => r || localStorage.getItem(baseURLKey) || p.baseURL);
      return { id: p.id, baseURL };
    });

  const [keyResults, baseURLResults] = await Promise.all([
    Promise.all(keyPromises),
    Promise.all(baseURLPromises),
  ]);

  const currentKeys: Record<string, string> = {};
  for (const r of keyResults) currentKeys[r.id] = r.key;

  const currentBaseURLs: Record<string, string> = {};
  for (const r of baseURLResults) currentBaseURLs[r.id] = r.baseURL;

  if (existing) {
    let match = true;
    for (const [id, key] of Object.entries(currentKeys)) {
      if (existing.keys[id] !== key) { match = false; break; }
    }
    for (const [id, url] of Object.entries(currentBaseURLs)) {
      if (existing.baseURLOverrides[id] !== url) { match = false; break; }
    }
    if (match) {
      existing.timestamp = Date.now();
      return existing.clients;
    }
  }

  const clients = new Map<string, ProviderClient>();
  for (const p of allProviders) {
    if (currentKeys[p.id]) {
      const client = getProviderClient(p.id, currentKeys[p.id], currentBaseURLs[p.id]);
      if (client) clients.set(p.id, client);
    }
  }

  providersCache.set(cacheKey, {
    clients,
    keys: currentKeys,
    baseURLOverrides: currentBaseURLs,
    timestamp: Date.now(),
  });

  return clients;
}
