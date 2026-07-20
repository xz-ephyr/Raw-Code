import { Router } from 'express';

const router = Router();

const ALLOWED_HOST_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(\.[a-zA-Z]{2,})?$/;
const PRIVATE_IPS = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.|::1|fe80:)/;

router.all('/proxy/*', async (req, res) => {
  const raw = req.path.replace(/^\//, '');
  const actualUrl = raw.replace(/^proxy\//, '');

  let parsed: URL;
  try {
    parsed = new URL(actualUrl);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    res.status(400).json({ error: 'Only http/https URLs allowed' });
    return;
  }
  const hostname = parsed.hostname;
  if (PRIVATE_IPS.test(hostname) || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]') {
    res.status(403).json({ error: 'Requests to private addresses are not allowed' });
    return;
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (key === 'host' || key === 'connection' || key === 'accept-encoding') continue;
    if (typeof value === 'string') headers[key] = value;
  }

  if ((actualUrl.includes('nvidia.com') || actualUrl.includes('mistral.ai') || actualUrl.includes('generativelanguage')) && process.env['LLM_DEBUG']) {
    try { console.log('[proxy:body]', JSON.stringify(req.body).slice(0, 500)); } catch {}
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
        let pumpTimedOut = false;
        const pumpTimeout = setTimeout(() => { pumpTimedOut = true; reader.cancel(); }, 120_000);
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { clearTimeout(pumpTimeout); res.end(); return; }
            if (pumpTimedOut) { clearTimeout(pumpTimeout); res.end(); return; }
            res.write(value);
          }
        } finally {
          clearTimeout(pumpTimeout);
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
