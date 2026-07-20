export type AuthType = 'oauth2' | 'token';

export interface ConnectorStatus {
  connected: boolean;
  identity: string | null;
  metadata?: Record<string, unknown>;
}

export interface TokenRow {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
  identity: string | null;
  metadata: string | null;
  connected: number;
}

export interface AuthUrlOptions {
  clientId?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  state?: string;
}

export interface ActionDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

export interface OAuthConfig {
  tokenEndpoint: string;
  authEndpoint: string;
  apiBaseUrl: string;
  revokeEndpoint?: string;
  scopes: string[];
}
