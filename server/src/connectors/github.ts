import { ConnectorService } from './base.js';

export class GitHubConnectorService extends ConnectorService {
  readonly provider = 'github';
  readonly authType = 'oauth2';
  readonly baseUrl = 'https://api.github.com';

  protected get oauthConfig() {
    return {
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      authEndpoint: 'https://github.com/login/oauth/authorize',
      revokeEndpoint: undefined,
      scopes: ['repo', 'user', 'read:org'],
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
      : this.getEnvVar('GITHUB_CLIENT_ID');

    const params: Record<string, string> = {
      client_id: clientId,
      redirect_uri: this.getRedirectUri(),
      scope: this.oauthConfig.scopes.join(' '),
    };

    if (options?.state) params.state = options.state;
    // GitHub doesn't support PKCE for OAuth2 apps (uses client_secret instead)

    return `${this.oauthConfig.authEndpoint}?${new URLSearchParams(params).toString()}`;
  }

  async exchangeCode(code: string, _codeVerifier?: string | null): Promise<{ identity: string }> {
    const clientId = this.getEnvVar('GITHUB_CLIENT_ID');
    const clientSecret = this.getEnvVar('GITHUB_CLIENT_SECRET');

    const res = await fetch(this.oauthConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: this.getRedirectUri(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub token exchange failed: ${err}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);

    const tempToken = data.access_token;

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tempToken}`, Accept: 'application/vnd.github.v3+json' },
    });
    let identity = '';
    if (userRes.ok) {
      const user = await userRes.json();
      identity = user.login;
    }

    await this.saveToken({
      accessToken: data.access_token,
      refreshToken: null, // GitHub access tokens don't expire by default
      expiresAt: null,
      scope: this.oauthConfig.scopes.join(' '),
      identity,
      metadata: identity ? { username: identity, avatar_url: userRes.ok ? (await userRes.json().catch(() => ({}))).avatar_url : undefined } : undefined,
    });

    return { identity };
  }

  async getStatus(): Promise<{ connected: boolean; identity: string | null }> {
    const result = await query<{ identity: string; connected: number }>(
      'SELECT identity, connected FROM oauth_tokens WHERE provider = $1',
      ['github']
    );
    if (result.rows.length === 0) return { connected: false, identity: null };
    return { connected: result.rows[0].connected === 1, identity: result.rows[0].identity || null };
  }

  async disconnect(): Promise<void> {
    await this.clearToken();
  }

  private getRedirectUri(): string {
    return (
      process.env.GITHUB_OAUTH_REDIRECT_URI ||
      `http://localhost:${process.env.PORT || 3001}/auth/github/callback`
    );
  }

  // --- API actions ---

  async listRepos(owner?: string) {
    const endpoint = owner ? `/users/${owner}/repos` : '/user/repos';
    return this.apiFetch(`${endpoint}?sort=updated&per_page=50`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
  }

  async listIssues(owner: string, repo: string) {
    return this.apiFetch(`/repos/${owner}/${repo}/issues?state=open&per_page=20`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
  }

  async listPRs(owner: string, repo: string) {
    return this.apiFetch(`/repos/${owner}/${repo}/pulls?state=open&per_page=20`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
  }

  async searchCode(query: string) {
    return this.apiFetch(`/search/code?q=${encodeURIComponent(query)}&per_page=20`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
  }

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      ...super.getActionHandlers(),
      repos: (params: any) => this.listRepos(params.owner),
      issues: (params: any) => this.listIssues(params.owner, params.repo),
      prs: (params: any) => this.listPRs(params.owner, params.repo),
      search: (params: any) => this.searchCode(params.query),
    };
  }
}
