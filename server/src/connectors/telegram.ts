import { query } from '../db.js';
import { encrypt, decrypt } from '../crypto.js';
import { ConnectorService } from './base.js';
import type { AuthType } from './types.js';

export class TelegramConnectorService extends ConnectorService {
  readonly provider = 'telegram';
  readonly authType: AuthType = 'token';
  readonly baseUrl = 'https://api.telegram.org';

  protected get oauthConfig() {
    return null; // Telegram uses bot tokens, not OAuth
  }

  getAuthUrl(): Promise<string> {
    throw new Error('Telegram uses bot tokens — use setToken() instead of OAuth');
  }

  exchangeCode(): Promise<{ identity: string }> {
    throw new Error('Telegram uses bot tokens — use setToken() instead of OAuth');
  }

  private botToken: string | null = null;

  async setToken(token: string): Promise<{ identity: string }> {
    // Validate token by calling getMe
    const res = await fetch(`${this.baseUrl}/bot${token}/getMe`);
    if (!res.ok) {
      throw new Error('Invalid Telegram bot token. Please check and try again.');
    }

    const data = await res.json();
    if (!data.ok || !data.result) {
      throw new Error('Invalid Telegram bot token.');
    }

    const botUser = data.result;
    const identity = botUser.username ? `@${botUser.username}` : botUser.first_name || '';

    const encryptedToken = encrypt(token);
    await query(
      `INSERT INTO oauth_tokens (provider, access_token, refresh_token, expires_at, scope, identity, metadata, connected, updated_at)
       VALUES ($1, $2, NULL, NULL, NULL, $3, $4, 1, $5)
       ON CONFLICT (provider) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         identity = EXCLUDED.identity,
         metadata = EXCLUDED.metadata,
         connected = 1,
         updated_at = EXCLUDED.updated_at`,
      [
        'telegram',
        encryptedToken,
        identity,
        JSON.stringify({ bot_id: botUser.id, first_name: botUser.first_name }),
        Date.now(),
      ]
    );

    this.botToken = token;
    return { identity };
  }

  async getStatus(): Promise<{ connected: boolean; identity: string | null }> {
    const result = await query<{ identity: string; connected: number }>(
      'SELECT identity, connected FROM oauth_tokens WHERE provider = $1',
      ['telegram']
    );
    if (result.rows.length === 0 || result.rows[0].connected !== 1) {
      return { connected: false, identity: null };
    }
    return { connected: true, identity: result.rows[0].identity || null };
  }

  async disconnect(): Promise<void> {
    this.botToken = null;
    await this.clearToken();
  }

  protected async getAccessToken(): Promise<string | null> {
    if (this.botToken) return this.botToken;
    const row = await this.getTokenRow();
    if (!row) return null;
    this.botToken = row.access_token;
    return row.access_token;
  }

  // --- API actions ---

  async sendMessage(chatId: string, text: string) {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Telegram not connected. Please set a bot token first.');

    const res = await fetch(`${this.baseUrl}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram API error (${res.status}): ${err}`);
    }

    return res.json();
  }

  async getUpdates(offset?: number) {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Telegram not connected.');

    const params = offset ? `?offset=${offset}` : '';
    const res = await fetch(`${this.baseUrl}/bot${token}/getUpdates${params}`);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram API error (${res.status}): ${err}`);
    }

    return res.json();
  }

  async getChat(chatId: string) {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Telegram not connected.');

    const res = await fetch(`${this.baseUrl}/bot${token}/getChat?chat_id=${chatId}`);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram API error (${res.status}): ${err}`);
    }

    return res.json();
  }

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      status: () => this.getStatus(),
      disconnect: () => this.disconnect(),
      'set-token': (params: any) => this.setToken(params.token),
      'send-message': (params: any) => this.sendMessage(params.chatId, params.text),
      'get-updates': (params: any) => this.getUpdates(params.offset),
      'get-chat': (params: any) => this.getChat(params.chatId),
    };
  }
}
