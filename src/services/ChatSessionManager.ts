import { ChatSession, Project } from '../types/chat';
import { DatabaseService } from './DatabaseService';
export const ChatSessionManager = {
  migrateFromLocalStorage: async () => {
    const keys = ['projects', 'chat_sessions', 'project_chat_sessions'];
    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const items = JSON.parse(stored);
          for (const item of items) {
            if (key === 'projects') await DatabaseService.createProject(item.name, item.path, item.id);
            else await DatabaseService.createSession(item.title, item.lastMessage, item.projectId, item.id);
          }
        } catch (e) { console.error(e); }
        localStorage.removeItem(key);
      }
    }
  },
  getAll: async (projectId?: string | null): Promise<ChatSession[]> => DatabaseService.getSessions(projectId) as any,
  create: async (title: string, lastMessage?: string, projectId?: string): Promise<ChatSession> => DatabaseService.createSession(title, lastMessage, projectId) as any,
  delete: async (id: string) => DatabaseService.deleteSession(id),
  archive: async (id: string) => {
    const s = await DatabaseService.getSession(id);
    if (s) await DatabaseService.updateSession(id, { archived: !s.archived });
  },
  rename: async (id: string, newTitle: string) => DatabaseService.updateSession(id, { title: newTitle }),
  getProjects: async (): Promise<Project[]> => DatabaseService.getProjects() as any,
  createProject: async (name: string, path: string): Promise<Project> => DatabaseService.createProject(name, path) as any,
  deleteProject: async (id: string) => DatabaseService.deleteProject(id),
};
