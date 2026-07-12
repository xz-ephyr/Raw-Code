import { Router } from 'express';

const router = Router();

router.all('/proxy/*', async (req, res) => {
  const raw = req.path.replace(/^\//, '');
  const actualUrl = raw.replace(/^proxy\//, '');

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (key === 'host' || key === 'connection' || key === 'accept-encoding') continue;
    if (typeof value === 'string') headers[key] = value;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(actualUrl, {
      method: req.method,
      headers: { ...headers, 'accept-encoding': 'identity' },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    res.status(response.status);
    for (const [key, value] of response.headers) {
      if (key === 'content-encoding' || key === 'transfer-encoding') continue;
      res.setHeader(key, value);
    }

    const reader = response.body?.getReader();
    if (reader) {
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); return; }
          res.write(value);
        }
      };
      pump().catch((e) => { console.error('Proxy stream error:', e); res.end(); });
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (err: any) {
    clearTimeout(timeout);
    const status = err.name === 'AbortError' ? 504 : 502;
    console.error('Proxy error:', err);
    res.status(status).json({ error: `Proxy request failed: ${err.message}` });
  }
});

export default router;
