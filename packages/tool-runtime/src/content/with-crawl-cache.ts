import { Effect } from 'effect';

const SERVER_URL = 'http://localhost:3001';

type CacheableRequest = {
  cacheKey: string;
  ttlSeconds?: number;
  fetch: () => Promise<any>;
};

function cacheLookup(cacheKey: string): Effect.Effect<{ hit: boolean; content?: any }> {
  return Effect.promise(() =>
    fetch(`${SERVER_URL}/crawl-cache/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ cacheKey }),
    })
      .then((r) => r.json())
      .catch(() => ({ hit: false })),
  );
}

function cacheStore(cacheKey: string, content: any, ttlSeconds: number): Effect.Effect<void> {
  return Effect.promise(() =>
    fetch(`${SERVER_URL}/crawl-cache/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ cacheKey, content, ttlSeconds }),
    })
      .then(() => undefined)
      .catch(() => undefined),
  );
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
