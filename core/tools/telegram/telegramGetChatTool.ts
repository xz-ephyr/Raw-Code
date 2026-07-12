import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const telegramGetChatTool = {
  name: 'telegram_get_chat',
  ...tool({
    description: 'Get information about a Telegram chat by chat ID. Returns chat name, type (private/group/channel), and member count. Use to verify a chat exists or get chat metadata.',
    inputSchema: zodSchema(z.object({
      chatId: z.string().describe('Telegram chat ID (numeric string like "123456789" or "@channelusername").'),
    })),
    execute: async ({ chatId }) => {
      try {
        return await ConnectorApi.callAction('telegram', 'get-chat', { chatId });
      } catch (error: any) {
        return { error: error.message || 'Failed to get Telegram chat info.' };
      }
    },
  }),
};
