import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use('/proxy', createProxyMiddleware({
  target: 'https://generativelanguage.googleapis.com',
  changeOrigin: true,
  pathRewrite: { '^/proxy': '' },
  onProxyReq: (proxyReq, req, res) => {
    // Forward all headers except host
    Object.keys(req.headers).forEach(key => {
      if (key !== 'host') {
        proxyReq.setHeader(key, req.headers[key]);
      }
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, x-goog-api-key';
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Bad Gateway', message: err.message });
  },
}));

app.use(express.json());

app.options('/proxy/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key');
  res.status(200).end();
});

app.listen(3001, () => {
  console.log('Proxy server running on http://localhost:3001');
});