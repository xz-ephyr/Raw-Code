import { ChatSession } from '@/types/chat';
import { DatabaseService } from '@core/utils/DatabaseService';

export const ChatSessionManager = {
  getAll: async (projectId?: string | null): Promise<ChatSession[]> => {
    if (projectId === undefined) {
      return DatabaseService.getSessions();
    }
    return DatabaseService.getSessions(projectId);
  },

  create: async (
    title: string,
    lastMessage?: string,
    projectId?: string
  ): Promise<ChatSession> => {
    return DatabaseService.createSession(title, lastMessage, projectId) as unknown as Promise<ChatSession>;
  },

  getSession: async (id: string): Promise<ChatSession | null> => {
    return DatabaseService.getSession(id) as unknown as Promise<ChatSession | null>;
  },

  delete: async (id: string) => {
    await DatabaseService.deleteSession(id);
  },

  archive: async (id: string) => {
    const session = await DatabaseService.getSession(id);
    if (session) {
      await DatabaseService.updateSession(id, { archived: !session.archived });
    }
  },

  rename: async (id: string, newTitle: string) => {
    await DatabaseService.updateSession(id, { title: newTitle });
  },

  touch: async (id: string) => {
    await DatabaseService.touchSession(id);
  },

  pin: async (id: string) => {
    await DatabaseService.setSessionPinned(id, true);
  },

  unpin: async (id: string) => {
    await DatabaseService.setSessionPinned(id, false);
  },

  markAsRead: async (id: string) => {
    await DatabaseService.updateSession(id, { unread: false });
    window.dispatchEvent(new CustomEvent('unread-changed'));
  },

  markAsUnread: async (id: string) => {
    await DatabaseService.updateSession(id, { unread: true });
    window.dispatchEvent(new CustomEvent('unread-changed'));
  },

  setStreaming: async (id: string, streaming: boolean) => {
    await DatabaseService.updateSession(id, { streaming });
  },

};
