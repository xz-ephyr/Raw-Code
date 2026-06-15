import { ChatSession, Project } from '../types/chat';

const SESSION_KEY = 'chat_sessions';
const PROJECT_KEY = 'projects';

const getStoredSessions = (): ChatSession[] => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : [];
};

const setStoredSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
};

const getStoredProjects = (): Project[] => {
  const stored = localStorage.getItem(PROJECT_KEY);
  return stored ? JSON.parse(stored) : [];
};

const setStoredProjects = (projects: Project[]) => {
  localStorage.setItem(PROJECT_KEY, JSON.stringify(projects));
};

export const ChatSessionManager = {
  // If no filter is provided, return all sessions.
  // If null is passed, return sessions without projectId.
  getAll: (projectId?: string | null): ChatSession[] => {
    const sessions = getStoredSessions();
    if (projectId === undefined) return sessions;
    if (projectId === null) return sessions.filter(s => !s.projectId);
    return sessions.filter(s => s.projectId === projectId);
  },
  
  create: (title: string, projectId?: string, lastMessage?: string): ChatSession => {
    const sessions = getStoredSessions();
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title,
      lastMessage,
      projectId,
      archived: false,
      createdAt: Date.now(),
    };
    sessions.push(session);
    setStoredSessions(sessions);
    return session;
  },

  delete: (id: string) => {
    const sessions = getStoredSessions().filter(s => s.id !== id);
    setStoredSessions(sessions);
  },

  archive: (id: string) => {
    const sessions = getStoredSessions();
    const session = sessions.find(s => s.id === id);
    if (session) {
      session.archived = !session.archived;
      setStoredSessions(sessions);
    }
  },

  rename: (id: string, newTitle: string) => {
    const sessions = getStoredSessions();
    const session = sessions.find(s => s.id === id);
    if (session) {
      session.title = newTitle;
      setStoredSessions(sessions);
    }
  },

  // Project Management
  getProjects: (): Project[] => {
    return getStoredProjects();
  },

  createProject: (name: string, path: string): Project => {
    const projects = getStoredProjects();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      path,
      createdAt: Date.now(),
    };
    projects.push(project);
    setStoredProjects(projects);
    return project;
  },

  deleteProject: (id: string) => {
    const projects = getStoredProjects().filter(p => p.id !== id);
    setStoredProjects(projects);
    // Also delete associated sessions
    const sessions = getStoredSessions().filter(s => s.projectId !== id);
    setStoredSessions(sessions);
  }
};
