import { query } from '../db.js';
import { ConnectorService } from './base.js';
import type { AuthType, OAuthConfig } from './types.js';

export abstract class GoogleConnectorService extends ConnectorService {
  readonly authType: AuthType = 'oauth2';

  protected abstract get googleScopes(): string[];
  protected abstract get profileUrl(): string;
  protected abstract extractIdentity(profileData: any): string;
  protected abstract get envPrefix(): string;

  protected get oauthConfig(): OAuthConfig {
    return {
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      revokeEndpoint: 'https://oauth2.googleapis.com/revoke',
      scopes: this.googleScopes,
    };
  }

  protected async getClientId(clientId?: string): Promise<string> {
    if (clientId && clientId !== 'env') return clientId;
    return this.resolveCredential(
      `${this.envPrefix}CLIENT_ID`,
      `${this.provider}-client-id`
    );
  }

  protected async getClientSecret(): Promise<string> {
    return this.resolveCredential(
      `${this.envPrefix}CLIENT_SECRET`,
      `${this.provider}-client-secret`
    );
  }

  protected getRedirectUri(): string {
    return (
      process.env[`${this.envPrefix}OAUTH_REDIRECT_URI`] ||
      `http://localhost:${process.env.PORT || 3001}/auth/${this.provider}/callback`
    );
  }

  async getAuthUrl(options?: {
    clientId?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    state?: string;
  }): Promise<string> {
    const effectiveClientId = await this.getClientId(options?.clientId);
    const scopes = this.googleScopes;

    const params: Record<string, string> = {
      client_id: effectiveClientId,
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    };

    if (options?.state) params.state = options.state;
    if (options?.codeChallenge) {
      params.code_challenge = options.codeChallenge;
      params.code_challenge_method = options.codeChallengeMethod || 'S256';
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(params).toString()}`;
  }

  async exchangeCode(code: string, codeVerifier?: string | null): Promise<{ identity: string }> {
    const clientId = await this.getClientId();
    const clientSecret = await this.getClientSecret();

    const body: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.getRedirectUri(),
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Token exchange failed: ${err}`);
    }

    const data = await res.json();
    const tempToken = data.access_token;

    const profileRes = await fetch(this.profileUrl, {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    let identity = '';
    if (profileRes.ok) {
      const profile = await profileRes.json();
      identity = this.extractIdentity(profile);
    }

    await this.saveToken({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
      scope: this.googleScopes.join(' '),
      identity,
    });

    return { identity };
  }

  async disconnect(): Promise<void> {
    const row = await this.getTokenRow();
    if (row?.refresh_token) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: row.refresh_token }),
        });
      } catch {
        // best effort revocation
      }
    }
    await this.clearToken();
  }

  async getStatus(): Promise<{ connected: boolean; identity: string | null }> {
    const result = await query<{ identity: string; connected: number }>(
      'SELECT identity, connected FROM oauth_tokens WHERE provider = $1',
      [this.provider]
    );
    if (result.rows.length === 0) return { connected: false, identity: null };
    return { connected: result.rows[0].connected === 1, identity: result.rows[0].identity || null };
  }
}
