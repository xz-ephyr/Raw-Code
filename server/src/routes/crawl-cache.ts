import { Router } from 'express';
import { querySync } from '../db';

const router = Router();

router.post('/crawl-cache/lookup', (req, res) => {
  try {
    const { cacheKey } = req.body;
    if (!cacheKey || typeof cacheKey !== 'string') {
      return res.json({ hit: false, error: 'Missing cacheKey' });
    }

    const { rows } = querySync<{ content: string; cached_at: number; ttl_seconds: number }>(
      'SELECT content, cached_at, ttl_seconds FROM crawl_cache WHERE cache_key = $1',
      [cacheKey],
    );

    if (rows.length === 0) {
      return res.json({ hit: false });
    }

    const row = rows[0];
    const age = Date.now() - row.cached_at;
    const fresh = age < row.ttl_seconds * 1000;

    if (!fresh) {
      return res.json({ hit: false, stale: true });
    }

    return res.json({ hit: true, content: JSON.parse(row.content) });
  } catch (err) {
    return res.status(500).json({ hit: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/crawl-cache/store', (req, res) => {
  try {
    const { cacheKey, content, ttlSeconds } = req.body;
    if (!cacheKey || typeof cacheKey !== 'string') {
      return res.status(400).json({ stored: false, error: 'Missing cacheKey' });
    }

    querySync(
      `INSERT INTO crawl_cache (cache_key, content, cached_at, ttl_seconds) VALUES ($1, $2, $3, $4)
       ON CONFLICT(cache_key) DO UPDATE SET content = $2, cached_at = $3, ttl_seconds = $4`,
      [cacheKey, JSON.stringify(content), Date.now(), ttlSeconds ?? 3600],
    );

    return res.json({ stored: true });
  } catch (err) {
    return res.status(500).json({ stored: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/crawl-cache/clear', (req, res) => {
  try {
    const { cacheKey, olderThan } = req.body;
    if (cacheKey) {
      querySync('DELETE FROM crawl_cache WHERE cache_key = $1', [cacheKey]);
    } else if (olderThan) {
      querySync('DELETE FROM crawl_cache WHERE cached_at < $1', [olderThan]);
    } else {
      querySync('DELETE FROM crawl_cache');
    }
    return res.json({ cleared: true });
  } catch (err) {
    return res.status(500).json({ cleared: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
