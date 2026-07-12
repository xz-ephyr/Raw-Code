import { create } from 'zustand';
import { ChatSession } from '@/types/chat';
import { ChatSessionManager } from '@/services/ChatSessionManager';

interface ChatsState {
  chats: ChatSession[];
  refresh: () => Promise<void>;
  setChats: (chats: ChatSession[]) => void;
  updateChat: (id: string, partial: Partial<ChatSession>) => void;
}

export const useChatsStore = create<ChatsState>((set) => ({
  chats: [],

  refresh: async () => {
    const allChats = await ChatSessionManager.getAll();
    set({ chats: allChats });
  },

  setChats: (chats) => set({ chats }),

  updateChat: (id, partial) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === id ? { ...c, ...partial } : c)),
    })),
}));
