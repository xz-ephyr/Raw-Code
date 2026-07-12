import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { ConnectorApi } from '@core/utils/ConnectorApi';

export const gmailListMessagesTool = {
  name: 'gmail_list_messages',
  ...tool({
    description: 'List Gmail inbox messages with optional search query. Returns message IDs, subjects, senders, dates, and snippets. Use when the user asks about their inbox, recent emails, or wants to search their Gmail. Supports Gmail search syntax like "from:alice", "subject:meeting", "after:2024/01/01", "is:unread".',
    inputSchema: zodSchema(z.object({
      query: z.string().optional().describe('Gmail search query (e.g. "from:example@email.com", "subject:meeting", "after:2024/1/1", "is:unread"). Empty returns inbox messages.'),
      maxResults: z.number().optional().default(10).describe('Number of messages to return (1-50).'),
    })),
    execute: async ({ query, maxResults }) => {
      try {
        return await ConnectorApi.callAction('gmail', 'list', { query, maxResults: Math.min(maxResults ?? 10, 50) });
      } catch (error: any) {
        return { error: error.message || 'Failed to list Gmail messages.' };
      }
    },
  }),
};
