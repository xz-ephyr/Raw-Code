import { query } from './db.js';

// --- Config helpers ---

async function getConfig(key: string): Promise<string | null> {
  const result = await query('SELECT value FROM app_config WHERE key = $1', [key]);
  return result.rows.length > 0 ? result.rows[0].value : null;
}

async function setConfig(key: string, value: string): Promise<void> {
  await query(
    'INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
}

// --- Token management ---

interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

async function getAccessToken(): Promise<string | null> {
  const token = await getConfig('gmail-access-token');
  if (!token) return null;

  const expiry = await getConfig('gmail-token-expiry');
  if (expiry && Date.now() < Number(expiry)) {
    return token;
  }

  // Token expired, try refresh
  const refreshToken = await getConfig('gmail-refresh-token');
  const clientId = await getConfig('gmail-client-id');
  const clientSecret = await getConfig('gmail-client-secret');

  if (!refreshToken || !clientId || !clientSecret) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    console.error('Gmail token refresh failed:', await res.text());
    return null;
  }

  const data: GmailTokens & { expires_in: number } = await res.json();
  await setConfig('gmail-access-token', data.access_token);
  await setConfig('gmail-token-expiry', String(Date.now() + data.expires_in * 1000));

  return data.access_token;
}

async function gmailFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error('Gmail not connected. Please authenticate first.');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${err}`);
  }

  return res.json();
}

// --- Public API ---

export async function getAuthUrl(clientId: string): Promise<string> {
  const redirectUri = `http://localhost:${process.env.PORT || 3001}/auth/gmail/callback`;
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.labels',
  ];

  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  }).toString()}`;
}

export async function exchangeCode(code: string): Promise<{ email: string }> {
  const clientId = await getConfig('gmail-client-id');
  const clientSecret = await getConfig('gmail-client-secret');
  if (!clientId || !clientSecret) throw new Error('Gmail OAuth credentials not configured');

  const redirectUri = `http://localhost:${process.env.PORT || 3001}/auth/gmail/callback`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data: GmailTokens & { expires_in: number } = await res.json();

  await setConfig('gmail-access-token', data.access_token);
  if (data.refresh_token) await setConfig('gmail-refresh-token', data.refresh_token);
  await setConfig('gmail-token-expiry', String(Date.now() + data.expires_in * 1000));
  await setConfig('gmail-connected', 'true');

  // Get user email
  const profile = await gmailFetch('/users/me/profile');
  await setConfig('gmail-email', profile.emailAddress);

  return { email: profile.emailAddress };
}

export async function listMessages(query_str: string = '', maxResults: number = 10) {
  const q = query_str || 'in:inbox';
  const list = await gmailFetch(`/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`);

  if (!list.messages || list.messages.length === 0) {
    return { messages: [], total: 0 };
  }

  const messages = await Promise.all(
    list.messages.slice(0, maxResults).map(async (msg: { id: string }) => {
      const full = await gmailFetch(`/users/me/messages/${msg.id}?format=metadata`);
      const headers = full.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      return {
        id: full.id,
        threadId: full.threadId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        snippet: full.snippet,
        labels: full.labelIds,
      };
    })
  );

  return { messages, total: list.resultSizeEstimate || messages.length };
}

export async function getMessage(messageId: string) {
  const msg = await gmailFetch(`/users/me/messages/${messageId}?format=full`);
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  let body = '';
  if (msg.payload?.body?.data) {
    body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
  } else if (msg.payload?.parts) {
    const textPart = msg.payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
    }
  }

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: getHeader('Subject'),
    from: getHeader('From'),
    to: getHeader('To'),
    date: getHeader('Date'),
    snippet: msg.snippet,
    body,
    labels: msg.labelIds,
  };
}

export async function sendMessage(to: string, subject: string, body: string) {
  const email = [`To: ${to}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\n');
  const encoded = Buffer.from(email).toString('base64url');

  const result = await gmailFetch('/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: encoded }),
  });

  return { id: result.id, threadId: result.threadId, labelIds: result.labelIds };
}

export async function listLabels() {
  const data = await gmailFetch('/users/me/labels');
  return (data.labels || []).map((l: any) => ({ id: l.id, name: l.name }));
}

export async function isConnected(): Promise<boolean> {
  const connected = await getConfig('gmail-connected');
  return connected === 'true';
}

export async function disconnect() {
  await setConfig('gmail-connected', 'false');
  await setConfig('gmail-access-token', '');
  await setConfig('gmail-refresh-token', '');
  await setConfig('gmail-token-expiry', '0');
}

export async function getEmail(): Promise<string | null> {
  return getConfig('gmail-email');
}
