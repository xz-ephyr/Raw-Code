import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const gmailReadMessageTool = {
  name: 'gmail_read_message',
  ...tool({
    description: 'Read the full content of a specific Gmail message by its ID. Returns headers (subject, from, to, date), body text, labels, and snippet. Use after gmail_list_messages when the user wants to see the full content of a specific email.',
    inputSchema: zodSchema(z.object({
      messageId: z.string().describe('The ID of the Gmail message to read. Obtained from gmail_list_messages.'),
    })),
    execute: async ({ messageId }) => {
      try {
        return await ConnectorApi.callAction('gmail', 'read', { messageId });
      } catch (error: any) {
        return { error: error.message || 'Failed to read Gmail message.' };
      }
    },
  }),
};
