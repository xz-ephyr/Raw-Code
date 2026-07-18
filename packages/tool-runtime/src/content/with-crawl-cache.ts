import { Effect } from 'effect';

const SERVER_URL = 'http://localhost:3001';

type CacheableRequest = {
  cacheKey: string;
  ttlSeconds?: number;
  fetch: () => Promise<any>;
};

function cacheLookup(cacheKey: string): Effect.Effect<{ hit: boolean; content?: any }> {
  return Effect.promise(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const r = await fetch(`${SERVER_URL}/crawl-cache/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ cacheKey }),
      });
      return await r.json();
    } catch {
      return { hit: false };
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  });
}

function cacheStore(cacheKey: string, content: any, ttlSeconds: number): Effect.Effect<void> {
  return Effect.promise(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(`${SERVER_URL}/crawl-cache/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ cacheKey, content, ttlSeconds }),
      });
    } catch {
      // best-effort cache write; ignore failures when server is unreachable
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  });
}

export function withCrawlCache<T>(req: CacheableRequest): Effect.Effect<T> {
  return Effect.gen(function* () {
    const cache = yield* cacheLookup(req.cacheKey);
    if (cache.hit && cache.content !== undefined) {
      yield* Effect.log(`Cache HIT for ${req.cacheKey}`);
      return cache.content as T;
    }

    yield* Effect.log(`Cache MISS for ${req.cacheKey}, fetching...`);
    const result: T = yield* Effect.promise(req.fetch);

    yield* cacheStore(req.cacheKey, result, req.ttlSeconds ?? 3600);
    return result;
  });
}

export function buildCacheKey(prefix: string, ...parts: (string | number | boolean | undefined | null)[]): string {
  return `${prefix}:${parts.filter((p) => p != null).join(':')}`;
}
