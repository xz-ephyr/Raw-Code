import express from 'express';
import cors from 'cors';
import { migrate } from './db.js';
import { auth } from './middleware/auth.js';
import { registerContentTools } from '@doktor/tool-runtime';
import proxyRoutes from './routes/proxy.js';
import projectRoutes from './routes/projects.js';
import fileRoutes from './routes/files.js';
import sessionRoutes from './routes/sessions.js';
import messageRoutes from './routes/messages.js';
import configRoutes from './routes/config.js';
import memoryRoutes from './routes/memory.js';
import gmailRoutes from './routes/gmail.js';
import websearchRoutes from './routes/websearch.js';
import connectorRoutes from './routes/connector.js';
import llmStreamRoutes from './routes/llm-stream.js';
import webhookRoutes from './routes/webhooks.js';
import crawlCacheRoutes from './routes/crawl-cache.js';
import { GmailConnectorService } from './connectors/gmail.js';
import { GitHubConnectorService } from './connectors/github.js';
import { YouTubeConnectorService } from './connectors/youtube.js';
import { TelegramConnectorService } from './connectors/telegram.js';
import { RedditConnectorService } from './connectors/reddit.js';
import { TwitterConnectorService } from './connectors/twitter.js';
import { GoogleDriveConnectorService } from './connectors/drive.js';
import { registry } from './connectors/registry.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: Infinity }));

// Generic OAuth callback — must be before auth middleware (OAuth providers don't send API key)
app.get('/auth/:provider/callback', async (req, res) => {
  const { provider, code, state, error } = req.params as any;
  // Try to get params from query string (Express extracts route params, actual params are in query)
  const actualProvider = req.params.provider;
  const actualCode = req.query.code as string;
  const actualState = req.query.state as string;
  const actualError = req.query.error as string;

  if (actualError) {
    return res.send(`<script>window.close();</script><p>Authorization denied. You can close this window.</p>`);
  }
  if (!actualCode || typeof actualCode !== 'string') {
    return res.status(400).send('Missing authorization code');
  }

  const service = registry.get(actualProvider);
  const type = service ? `${actualProvider}-oauth-callback` : 'oauth-callback';

  const safeCode = jsEscape(actualCode);
  const safeState = jsEscape(actualState ? String(actualState) : '');

  res.send(`
    <!DOCTYPE html>
    <html><body><script>
      if (window.opener) {
        window.opener.postMessage({
          type: '${type}',
          code: '${safeCode}',
          state: '${safeState}'
        }, '*');
      }
      window.close();
    </script><p>Authentication successful. You can close this window.</p></body></html>
  `);
});

// Backward compat Gmail OAuth callback
app.get('/auth/gmail/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    return res.send(`<script>window.close();</script><p>Authorization denied. You can close this window.</p>`);
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code');
  }
  const safeCode = jsEscape(code);
  const safeState = jsEscape(state ? String(state) : '');
  res.send(`
    <!DOCTYPE html>
    <html><body><script>
      if (window.opener) {
        window.opener.postMessage({
          type: 'gmail-oauth-callback',
          code: '${safeCode}',
          state: '${safeState}'
        }, '*');
      }
      window.close();
    </script><p>Authentication successful. You can close this window.</p></body></html>
  `);
});

// Webhook routes — must be before auth middleware (webhooks don't send API key)
app.use(webhookRoutes);
app.use(crawlCacheRoutes);

function jsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\//g, '\\/');
}

app.use(auth);

app.use(proxyRoutes);
app.use(projectRoutes);
app.use(fileRoutes);
app.use(sessionRoutes);
app.use(messageRoutes);
app.use(configRoutes);
app.use(memoryRoutes);
app.use(gmailRoutes);
app.use(websearchRoutes);
app.use(connectorRoutes);
app.use('/llm', llmStreamRoutes);

const PORT = process.env.PORT || 3001;

async function start() {
  await migrate();
  registerContentTools('content');

  // Register connectors
  registry.register(new GmailConnectorService());
  registry.register(new GitHubConnectorService());
  registry.register(new YouTubeConnectorService());
  registry.register(new TelegramConnectorService());
  registry.register(new RedditConnectorService());
  registry.register(new TwitterConnectorService());
  registry.register(new GoogleDriveConnectorService());

  app.listen(PORT, () => {
    console.log(`DokTor server running on http://localhost:${PORT}`);
  });
}

start();
