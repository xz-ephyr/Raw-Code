import { GoogleConnectorService } from './google-base.js';
import type { ActionDefinition } from './types.js';

export class GmailConnectorService extends GoogleConnectorService {
  readonly provider = 'gmail';
  readonly baseUrl = 'https://gmail.googleapis.com/gmail/v1';
  readonly envPrefix = 'GMAIL_';

  protected get googleScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.labels',
    ];
  }

  protected get profileUrl(): string {
    return 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
  }

  protected extractIdentity(profile: any): string {
    return profile.emailAddress || '';
  }

  async listMessages(queryStr: string = '', maxResults: number = 10) {
    const q = queryStr || 'in:inbox';
    const list = await this.apiFetch(
      `/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${Math.min(maxResults, 50)}`
    );

    if (!list.messages || list.messages.length === 0) {
      return { messages: [], total: 0 };
    }

    const messages = await Promise.all(
      list.messages.slice(0, maxResults).map(async (msg: { id: string }) => {
        const full = await this.apiFetch(`/users/me/messages/${msg.id}?format=metadata`);
        const headers = full.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

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

  async getMessage(messageId: string) {
    const msg = await this.apiFetch(`/users/me/messages/${messageId}?format=full`);
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

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

  async sendMessage(to: string, subject: string, body: string) {
    const email = [`To: ${to}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\n');
    const encoded = Buffer.from(email).toString('base64url');

    const result = await this.apiFetch('/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: encoded }),
    });

    return { id: result.id, threadId: result.threadId, labelIds: result.labelIds };
  }

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      ...super.getActionHandlers(),
      list: (params: any) => this.listMessages(params.query, params.maxResults),
      read: (params: any) => this.getMessage(params.messageId),
      send: (params: any) => this.sendMessage(params.to, params.subject, params.body),
    };
  }

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'list',
        description: 'List Gmail messages matching a search query',
        inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Gmail search query (default: in:inbox)' }, maxResults: { type: 'number', description: 'Maximum results (max 50)' } } },
        outputSchema: { type: 'object', properties: { messages: { type: 'array', items: { type: 'object' } }, total: { type: 'number' } } },
      },
      {
        name: 'read',
        description: 'Read a specific Gmail message by ID',
        inputSchema: { type: 'object', properties: { messageId: { type: 'string', description: 'Gmail message ID' } }, required: ['messageId'] },
        outputSchema: { type: 'object', properties: { id: { type: 'string' }, threadId: { type: 'string' }, subject: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, date: { type: 'string' }, snippet: { type: 'string' }, body: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } } } },
      },
      {
        name: 'send',
        description: 'Send an email via Gmail',
        inputSchema: { type: 'object', properties: { to: { type: 'string', description: 'Recipient email' }, subject: { type: 'string', description: 'Email subject' }, body: { type: 'string', description: 'Email body text' } }, required: ['to', 'subject', 'body'] },
        outputSchema: { type: 'object', properties: { id: { type: 'string' }, threadId: { type: 'string' }, labelIds: { type: 'array', items: { type: 'string' } } } },
      },
    ];
  }
}
