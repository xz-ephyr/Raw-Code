import { query } from '../db.js';
import { encrypt, decrypt } from '../crypto.js';
import type { AuthType, ConnectorStatus, TokenRow, AuthUrlOptions } from './types.js';

export abstract class ConnectorService {
  abstract get provider(): string;
  abstract get authType(): AuthType;
  abstract get baseUrl(): string;
  protected abstract get oauthConfig(): Omit<OAuthConfig, 'apiBaseUrl'> | null;

  protected getEncryptionKey(): string {
    return process.env.CONNECTOR_ENCRYPTION_KEY || process.env.GMAIL_ENCRYPTION_KEY || '';
  }

  protected async getTokenRow(): Promise<TokenRow | null> {
    const result = await query<TokenRow>(
      'SELECT access_token, refresh_token, expires_at, scope, identity, metadata FROM oauth_tokens WHERE provider = $1',
      [this.provider]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
      ...row,
      access_token: decrypt(row.access_token),
      refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null,
    };
  }

  private refreshInProgress = false;
  private refreshPromise: Promise<string | null> | null = null;

  protected async getAccessToken(): Promise<string | null> {
    const row = await this.getTokenRow();
    if (!row) return null;

    if (row.expires_at && Date.now() < row.expires_at - 60000) {
      return row.access_token;
    }

    if (!row.refresh_token || this.authType === 'token') return null;

    if (this.refreshInProgress && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshInProgress = true;
    this.refreshPromise = (async () => {
      try {
        const config = this.getRefreshConfig();
        if (!config) return null;

        const res = await fetch(config.tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: row.refresh_token!,
            grant_type: 'refresh_token',
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`${this.provider} token refresh failed:`, errText);
          if (res.status === 400 || res.status === 401) {
            await query(
              'UPDATE oauth_tokens SET connected = 0, updated_at = $1 WHERE provider = $2',
              [Date.now(), this.provider]
            );
          }
          return null;
        }

        const data = await res.json();
        const encryptedAccess = encrypt(data.access_token);
        const expiresAt = Date.now() + data.expires_in * 1000;

        await query(
          'UPDATE oauth_tokens SET access_token = $1, expires_at = $2, connected = 1, updated_at = $3 WHERE provider = $4',
          [encryptedAccess, expiresAt, Date.now(), this.provider]
        );

        return data.access_token;
      } finally {
        this.refreshInProgress = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  protected getRefreshConfig(): { tokenEndpoint: string; clientId: string; clientSecret: string } | null {
    const config = this.oauthConfig;
    if (!config) return null;
    const clientId = this.getEnvVar(`${this.provider.toUpperCase()}_CLIENT_ID`);
    const clientSecret = this.getEnvVar(`${this.provider.toUpperCase()}_CLIENT_SECRET`);
    return { tokenEndpoint: config.tokenEndpoint, clientId, clientSecret };
  }

  protected async apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) throw new Error(`${this.provider} not connected. Please authenticate first.`);

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
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
      throw new Error(`${this.provider} API error (${res.status}): ${err}`);
    }

    return res.json();
  }

  protected getEnvVar(name: string): string {
    const val = process.env[name];
    if (!val) throw new Error(`${name} environment variable not set for ${this.provider} connector`);
    return val;
  }

  protected async saveToken(data: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: number | null;
    scope?: string;
    identity?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const encryptedAccess = encrypt(data.accessToken);
    const encryptedRefresh = data.refreshToken ? encrypt(data.refreshToken) : null;

    await query(
      `INSERT INTO oauth_tokens (provider, access_token, refresh_token, expires_at, scope, identity, metadata, connected, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)
       ON CONFLICT (provider) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token),
         expires_at = EXCLUDED.expires_at,
         scope = EXCLUDED.scope,
         identity = EXCLUDED.identity,
         metadata = EXCLUDED.metadata,
         connected = 1,
         updated_at = EXCLUDED.updated_at`,
      [
        this.provider,
        encryptedAccess,
        encryptedRefresh,
        data.expiresAt ?? null,
        data.scope ?? null,
        data.identity ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        Date.now(),
      ]
    );
  }

  protected async clearToken(): Promise<void> {
    await query('DELETE FROM oauth_tokens WHERE provider = $1', [this.provider]);
  }

  // --- Abstract lifecycle methods ---

  abstract getAuthUrl(options?: AuthUrlOptions): Promise<string>;
  abstract exchangeCode(code: string, codeVerifier?: string | null): Promise<{ identity: string }>;
  abstract getStatus(): Promise<ConnectorStatus>;
  abstract disconnect(): Promise<void>;

  // --- Action handlers for generic routing ---

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      'auth-url': (params: any) =>
        this.getAuthUrl({
          clientId: params.clientId,
          codeChallenge: params.codeChallenge,
          codeChallengeMethod: params.codeChallengeMethod,
          state: params.state,
        }),
      exchange: (params: any) => this.exchangeCode(params.code, params.codeVerifier ?? null),
      status: () => this.getStatus(),
      disconnect: () => this.disconnect(),
    };
  }
}
