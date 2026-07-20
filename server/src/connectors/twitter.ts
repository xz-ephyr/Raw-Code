import { query } from '../db.js';
import { ConnectorService } from './base.js';
import type { ActionDefinition } from './types.js';

export class TwitterConnectorService extends ConnectorService {
  readonly provider = 'twitter';
  readonly authType = 'oauth2';
  readonly baseUrl = 'https://api.twitter.com/2';

  protected get oauthConfig() {
    return {
      tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
      authEndpoint: 'https://twitter.com/i/oauth2/authorize',
      revokeEndpoint: 'https://api.twitter.com/2/oauth2/revoke',
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
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
      : await this.resolveCredential('TWITTER_CLIENT_ID', 'twitter-client-id');

    const params: Record<string, string> = {
      client_id: clientId,
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      scope: this.oauthConfig.scopes.join(' '),
      state: options?.state || Math.random().toString(36).slice(2),
      code_challenge: options?.codeChallenge || '',
      code_challenge_method: options?.codeChallengeMethod || 'S256',
    };

    return `${this.oauthConfig.authEndpoint}?${new URLSearchParams(params).toString()}`;
  }

  async exchangeCode(code: string, codeVerifier?: string | null): Promise<{ identity: string }> {
    const clientId = await this.resolveCredential('TWITTER_CLIENT_ID', 'twitter-client-id');
    const clientSecret = await this.resolveCredential('TWITTER_CLIENT_SECRET', 'twitter-client-secret');
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body: Record<string, string> = {
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: this.getRedirectUri(),
      code_verifier: codeVerifier || '',
    };

    const res = await fetch(this.oauthConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Twitter token exchange failed: ${err}`);
    }

    const data = await res.json();
    const tempToken = data.access_token;

    const userRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    let identity = '';
    if (userRes.ok) {
      const user = await userRes.json();
      identity = user.data?.username || '';
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
      ['twitter']
    );
    if (result.rows.length === 0) return { connected: false, identity: null };
    return { connected: result.rows[0].connected === 1, identity: result.rows[0].identity || null };
  }

  async disconnect(): Promise<void> {
    const row = await this.getTokenRow();
    if (row?.refresh_token) {
      try {
        const clientId = await this.resolveCredential('TWITTER_CLIENT_ID', 'twitter-client-id');
        const clientSecret = await this.resolveCredential('TWITTER_CLIENT_SECRET', 'twitter-client-secret');
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
      process.env.TWITTER_OAUTH_REDIRECT_URI ||
      `http://localhost:${process.env.PORT || 3001}/auth/twitter/callback`
    );
  }

  // --- API actions ---

  async getTimeline(maxResults: number = 20) {
    // First get the user's ID
    const token = await this.getAccessToken();
    if (!token) throw new Error('Twitter not connected.');

    const userRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) throw new Error('Failed to get Twitter user');
    const user = await userRes.json();
    const userId = user.data?.id;
    if (!userId) throw new Error('Could not determine Twitter user ID');

    return this.apiFetch(`/users/${userId}/timelines/reverse_chronological?max_results=${Math.min(maxResults, 100)}`);
  }

  async postTweet(text: string) {
    return this.apiFetch('/tweets', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async searchTweets(query: string, maxResults: number = 10) {
    return this.apiFetch(
      `/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(maxResults, 100)}`
    );
  }

  async getUser(username: string) {
    return this.apiFetch(`/users/by/username/${username}`);
  }

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      ...super.getActionHandlers(),
      timeline: (params: any) => this.getTimeline(params.maxResults),
      tweet: (params: any) => this.postTweet(params.text),
      search: (params: any) => this.searchTweets(params.query, params.maxResults),
      user: (params: any) => this.getUser(params.username),
    };
  }

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'timeline',
        description: 'Get your Twitter timeline',
        inputSchema: { type: 'object', properties: { maxResults: { type: 'number', description: 'Max tweets (max 100)' } } },
        outputSchema: { type: 'object' },
      },
      {
        name: 'tweet',
        description: 'Post a tweet',
        inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'Tweet text' } }, required: ['text'] },
        outputSchema: { type: 'object' },
      },
      {
        name: 'search',
        description: 'Search recent tweets',
        inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' }, maxResults: { type: 'number', description: 'Max results (max 100)' } }, required: ['query'] },
        outputSchema: { type: 'object' },
      },
      {
        name: 'user',
        description: 'Look up a Twitter user by username',
        inputSchema: { type: 'object', properties: { username: { type: 'string', description: 'Twitter username' } }, required: ['username'] },
        outputSchema: { type: 'object' },
      },
    ];
  }
}
