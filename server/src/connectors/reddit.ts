import { query } from '../db.js';
import { ConnectorService } from './base.js';

export class RedditConnectorService extends ConnectorService {
  readonly provider = 'reddit';
  readonly authType = 'oauth2';
  readonly baseUrl = 'https://oauth.reddit.com';

  protected get oauthConfig() {
    return {
      tokenEndpoint: 'https://www.reddit.com/api/v1/access_token',
      authEndpoint: 'https://www.reddit.com/api/v1/authorize',
      revokeEndpoint: 'https://www.reddit.com/api/v1/revoke_token',
      scopes: ['identity', 'read', 'submit', 'history'],
    };
  }

  async getAuthUrl(options?: {
    clientId?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    state?: string;
  }): Promise<string> {
    const clientId = options?.clientId && options.clientId !== 'env'
      ? options.clientId
      : this.getEnvVar('REDDIT_CLIENT_ID');

    const params: Record<string, string> = {
      client_id: clientId,
      response_type: 'code',
      state: options?.state || Math.random().toString(36).slice(2),
      redirect_uri: this.getRedirectUri(),
      duration: 'permanent',
      scope: this.oauthConfig.scopes.join(' '),
    };

    return `${this.oauthConfig.authEndpoint}?${new URLSearchParams(params).toString()}`;
  }

  async exchangeCode(code: string, _codeVerifier?: string | null): Promise<{ identity: string }> {
    const clientId = this.getEnvVar('REDDIT_CLIENT_ID');
    const clientSecret = this.getEnvVar('REDDIT_CLIENT_SECRET');
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch(this.oauthConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RawCode/1.0',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.getRedirectUri(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Reddit token exchange failed: ${err}`);
    }

    const data = await res.json();
    const tempToken = data.access_token;

    const userRes = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: { Authorization: `Bearer ${tempToken}`, 'User-Agent': 'RawCode/1.0' },
    });
    let identity = '';
    if (userRes.ok) {
      const user = await userRes.json();
      identity = user.name || '';
    }

    await this.saveToken({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
      scope: this.oauthConfig.scopes.join(' '),
      identity,
    });

    return { identity };
  }

  async getStatus(): Promise<{ connected: boolean; identity: string | null }> {
    const result = await query<{ identity: string; connected: number }>(
      'SELECT identity, connected FROM oauth_tokens WHERE provider = $1',
      ['reddit']
    );
    if (result.rows.length === 0) return { connected: false, identity: null };
    return { connected: result.rows[0].connected === 1, identity: result.rows[0].identity || null };
  }

  async disconnect(): Promise<void> {
    const row = await this.getTokenRow();
    if (row?.refresh_token) {
      try {
        const clientId = this.getEnvVar('REDDIT_CLIENT_ID');
        const clientSecret = this.getEnvVar('REDDIT_CLIENT_SECRET');
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        await fetch(this.oauthConfig.revokeEndpoint!, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token: row.refresh_token, token_type_hint: 'refresh_token' }),
        });
      } catch {
        // best effort revocation
      }
    }
    await this.clearToken();
  }

  private getRedirectUri(): string {
    return (
      process.env.REDDIT_OAUTH_REDIRECT_URI ||
      `http://localhost:${process.env.PORT || 3001}/auth/reddit/callback`
    );
  }

  // --- API actions ---

  async getHot(subreddit: string, limit: number = 25) {
    return this.apiFetch(`/r/${subreddit}/hot?limit=${Math.min(limit, 100)}`, {
      headers: { 'User-Agent': 'RawCode/1.0' },
    });
  }

  async searchPosts(query: string, subreddit?: string, limit: number = 25) {
    const subParam = subreddit ? `+subreddit:${subreddit}` : '';
    return this.apiFetch(
      `/search?q=${encodeURIComponent(query)}${subParam}&limit=${Math.min(limit, 100)}`,
      { headers: { 'User-Agent': 'RawCode/1.0' } }
    );
  }

  async submitPost(subreddit: string, title: string, text: string) {
    return this.apiFetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'RawCode/1.0' },
      body: new URLSearchParams({
        sr: subreddit,
        title,
        text,
        kind: 'self',
      }).toString(),
    });
  }

  async getComments(postId: string, limit: number = 20) {
    return this.apiFetch(`/comments/${postId}?limit=${Math.min(limit, 100)}`, {
      headers: { 'User-Agent': 'RawCode/1.0' },
    });
  }

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      ...super.getActionHandlers(),
      hot: (params: any) => this.getHot(params.subreddit, params.limit),
      search: (params: any) => this.searchPosts(params.query, params.subreddit, params.limit),
      submit: (params: any) => this.submitPost(params.subreddit, params.title, params.text),
      comments: (params: any) => this.getComments(params.postId, params.limit),
    };
  }
}
