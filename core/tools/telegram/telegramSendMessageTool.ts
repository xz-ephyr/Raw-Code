import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const telegramSendMessageTool = {
  name: 'telegram_send_message',
  ...tool({
    description: 'Send a message to a Telegram chat by chat ID. Use when the user wants to send a Telegram message. Requires the chat ID (numeric) and message text.',
    inputSchema: zodSchema(z.object({
      chatId: z.string().describe('Telegram chat ID (numeric string like "123456789" or "@channelusername").'),
      text: z.string().describe('Message text to send.'),
    })),
    execute: async ({ chatId, text }) => {
      try {
        return await ConnectorApi.callAction('telegram', 'send-message', { chatId, text });
      } catch (error: any) {
        return { error: error.message || 'Failed to send Telegram message.' };
      }
    },
  }),
};
