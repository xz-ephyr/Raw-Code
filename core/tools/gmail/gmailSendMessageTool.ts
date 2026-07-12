import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const gmailSendMessageTool = {
  name: 'gmail_send_message',
  ...tool({
    description: 'Send an email via the user\'s Gmail account. Requires recipient email address, subject line, and body text. Use when the user asks to send, compose, or draft an email. This is a destructive action — user confirmation may be required before sending.',
    inputSchema: zodSchema(z.object({
      to: z.string().describe('Recipient email address.'),
      subject: z.string().describe('Email subject line.'),
      body: z.string().describe('Email body content (plain text).'),
    })),
    execute: async ({ to, subject, body }) => {
      try {
        return await ConnectorApi.callAction('gmail', 'send', { to, subject, body });
      } catch (error: any) {
        return { error: error.message || 'Failed to send Gmail message.' };
      }
    },
  }),
};
