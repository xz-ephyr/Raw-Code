import { ConnectorApi } from './ConnectorApi';

export const GmailService = {
  async listMessages(query?: string, maxResults?: number) {
    return ConnectorApi.callAction('gmail', 'list', { query, maxResults });
  },

  async readMessage(messageId: string) {
    return ConnectorApi.callAction('gmail', 'read', { messageId });
  },

  async sendMessage(to: string, subject: string, body: string) {
    return ConnectorApi.callAction('gmail', 'send', { to, subject, body });
  },

  async getStatus(): Promise<{ connected: boolean; email: string | null }> {
    const status = await ConnectorApi.getStatus('gmail');
    return { connected: status.connected, email: status.identity };
  },
};
