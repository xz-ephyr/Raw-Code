import { ChatSession } from '../types/chat';

// For now, this is a simple local state simulation. 
// In a real app, this would use a persistent store (e.g., Tauri's filesystem or indexedDB).
let sessions: ChatSession[] = [];

export const ChatSessionManager = {
  getAll: (projectId?: string): ChatSession[] => {
    return sessions.filter(s => projectId ? s.projectId === projectId : !s.projectId);
  },
  
  create: (title: string, projectId?: string): ChatSession => {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title,
      projectId,
      archived: false,
      createdAt: Date.now(),
    };
    sessions.push(session);
    return session;
  },

  delete: (id: string) => {
    sessions = sessions.filter(s => s.id !== id);
  },

  archive: (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) session.archived = true;
  },

  rename: (id: string, newTitle: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) session.title = newTitle;
  },
};
