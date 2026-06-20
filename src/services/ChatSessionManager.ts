import { ChatSession, Project } from '../types/chat';
import { DatabaseService } from './DatabaseService';

const SESSION_KEY = 'chat_sessions';
const PROJECT_SESSION_KEY = 'project_chat_sessions';
const PROJECT_KEY = 'projects';

const getStoredSessions = (isProject: boolean): ChatSession[] => {
  const key = isProject ? PROJECT_SESSION_KEY : SESSION_KEY;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

const setStoredSessions = (sessions: ChatSession[], isProject: boolean) => {
  const key = isProject ? PROJECT_SESSION_KEY : SESSION_KEY;
  localStorage.setItem(key, JSON.stringify(sessions));
};

    const storedProjects = localStorage.getItem(PROJECT_KEY);
    if (storedProjects) {
      const projects = JSON.parse(storedProjects);
      for (const p of projects) {
        await DatabaseService.createProject(p.name, p.path, p.id);
      }
      localStorage.removeItem(PROJECT_KEY);
    }

    const storedSessions = localStorage.getItem(SESSION_KEY);
    if (storedSessions) {
      const sessions = JSON.parse(storedSessions);
      for (const s of sessions) {
        await DatabaseService.createSession(s.title, s.lastMessage, s.projectId, s.id);
      }
      localStorage.removeItem(SESSION_KEY);
    }
  },

export const ChatSessionManager = {
  // If no filter is provided, return all sessions from both stores.
  // If null is passed, return sessions without projectId (from normal store).
  getAll: (projectId?: string | null): ChatSession[] => {
    if (projectId === undefined) {
      return [...getStoredSessions(false), ...getStoredSessions(true)];
    }
    if (projectId === null) {
      return getStoredSessions(false);
    }
    return getStoredSessions(true).filter((s) => s.projectId === projectId);
  },

  create: (title: string, lastMessage?: string, projectId?: string): ChatSession => {
    const isProject = !!projectId;
    const sessions = getStoredSessions(isProject);
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title,
      lastMessage,
      projectId,
      archived: false,
      createdAt: Date.now(),
    };
    sessions.push(session);
    setStoredSessions(sessions, isProject);
    return session;
  },

  delete: (id: string) => {
    // Try both
    const normal = getStoredSessions(false);
    const normalFiltered = normal.filter((s) => s.id !== id);
    if (normal.length !== normalFiltered.length) {
      setStoredSessions(normalFiltered, false);
      return;
    }

    const project = getStoredSessions(true);
    const projectFiltered = project.filter((s) => s.id !== id);
    setStoredSessions(projectFiltered, true);
  },

  archive: (id: string) => {
    const normal = getStoredSessions(false);
    const nSession = normal.find((s) => s.id === id);
    if (nSession) {
      nSession.archived = !nSession.archived;
      setStoredSessions(normal, false);
      return;
    }

    const project = getStoredSessions(true);
    const pSession = project.find((s) => s.id === id);
    if (pSession) {
      pSession.archived = !pSession.archived;
      setStoredSessions(project, true);
    }
  },

  rename: (id: string, newTitle: string) => {
    const normal = getStoredSessions(false);
    const nSession = normal.find((s) => s.id === id);
    if (nSession) {
      nSession.title = newTitle;
      setStoredSessions(normal, false);
      return;
    }

    const project = getStoredSessions(true);
    const pSession = project.find((s) => s.id === id);
    if (pSession) {
      pSession.title = newTitle;
      setStoredSessions(project, true);
    }
  },

  // Project Management
  getProjects: async (): Promise<Project[]> => {
    return DatabaseService.getProjects() as unknown as Promise<Project[]>;
  },

  createProject: async (name: string, path: string): Promise<Project> => {
    return DatabaseService.createProject(name, path) as unknown as Promise<Project>;
  },

  deleteProject: (id: string) => {
    const projects = getStoredProjects().filter((p) => p.id !== id);
    setStoredProjects(projects);
    // Also delete associated sessions from project store
    const sessions = getStoredSessions(true).filter((s) => s.projectId !== id);
    setStoredSessions(sessions, true);
  },
};
