const API_BASE = () => import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3001');

export const ConnectorApi = {
  async getStatus(provider: string): Promise<{ connected: boolean; identity: string | null }> {
    const res = await fetch(`${API_BASE()}/connector/${provider}/status`, { method: 'POST' });
    return res.json();
  },

  async getAuthUrl(provider: string, clientId?: string, codeChallenge?: string, codeChallengeMethod?: string, state?: string): Promise<{ url: string }> {
    const res = await fetch(`${API_BASE()}/connector/${provider}/auth-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, codeChallenge, codeChallengeMethod, state }),
    });
    return res.json();
  },

  async exchangeCode(provider: string, code: string, codeVerifier?: string | null): Promise<{ identity: string }> {
    const res = await fetch(`${API_BASE()}/connector/${provider}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier }),
    });
    return res.json();
  },

  async disconnect(provider: string): Promise<void> {
    await fetch(`${API_BASE()}/connector/${provider}/disconnect`, { method: 'POST' });
  },

  async callAction(provider: string, action: string, params?: any): Promise<any> {
    const res = await fetch(`${API_BASE()}/connector/${provider}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: params ? JSON.stringify(params) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
