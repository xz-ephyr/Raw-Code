import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../lib/tauri';

interface ProjectRow {
  id: string;
  name: string;
  path: string;
  createdAt: number;
}

interface SessionRow {
  id: string;
  title: string;
  lastMessage: string | null;
  projectId: string | null;
  archived: boolean;
  createdAt: number;
}

interface MessageRow {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  reasoning: string | null;
  toolInvocations: string | null;
  createdAt: number;
}

export const DatabaseService = {
  // Projects
  async getProjects() {
    const rows = await invoke<ProjectRow[]>('get_projects');
    return rows.map(({ createdAt, ...rest }) => ({
      ...rest,
      createdAt: Number(createdAt),
    }));
  },

  async createProject(name: string, path: string, existingId?: string) {
    const id = existingId || crypto.randomUUID();
    const createdAt = Date.now();
    const row = await invoke<ProjectRow>('create_project', {
      name,
      path,
      existingId: id,
    });
    return { ...row, createdAt: Number(row.createdAt) };
  },

  async deleteProject(id: string) {
    await invoke('delete_project', { id });
  },

  // Sessions
  async getSessions(projectId?: string | null) {
    const rows = await invoke<SessionRow[]>('get_sessions', {
      projectId: projectId ?? null,
    });
    return rows.map(({ createdAt, ...rest }) => ({
      ...rest,
      createdAt: Number(createdAt),
    }));
  },

  async getSession(id: string) {
    const row = await invoke<SessionRow | null>('get_session', { id });
    if (!row) return null;
    return { ...row, createdAt: Number(row.createdAt) };
  },

  async createSession(
    title: string,
    lastMessage?: string,
    projectId?: string,
    existingId?: string
  ) {
    const id = existingId || crypto.randomUUID();
    const createdAt = Date.now();
    const row = await invoke<SessionRow>('create_session', {
      title,
      lastMessage: lastMessage || null,
      projectId: projectId || null,
      existingId: id,
    });
    return { ...row, archived: false, createdAt: Number(row.createdAt) };
  },

  async updateSession(
    id: string,
    updates: { title?: string; lastMessage?: string; archived?: boolean }
  ) {
    await invoke('update_session', {
      id,
      title: updates.title ?? null,
      lastMessage: updates.lastMessage ?? null,
      archived: updates.archived ?? null,
    });
  },

  async deleteSession(id: string) {
    await invoke('delete_session', { id });
  },

  // Messages
  async getMessages(sessionId: string) {
    const rows = await invoke<MessageRow[]>('get_messages', { sessionId });
    return rows.map(({ sessionId: sid, toolInvocations, createdAt, ...rest }) => ({
      ...rest,
      sessionId: sid,
      createdAt: Number(createdAt),
      toolInvocations: toolInvocations ? JSON.parse(toolInvocations) : undefined,
    }));
  },

  async saveMessages(sessionId: string, messages: any[]) {
    const messagesToSave = messages.map((m) => ({
      id: m.id || crypto.randomUUID(),
      sessionId,
      role: m.role,
      content: m.content,
      reasoning: m.reasoning || null,
      toolInvocations: m.toolInvocations ? JSON.stringify(m.toolInvocations) : null,
      createdAt: m.createdAt || Date.now(),
    }));
    await invoke('save_messages', { sessionId, messages: messagesToSave });
  },

  // App Config
  async getConfig(key: string): Promise<string | null> {
    if (isTauri()) {
      return invoke<string | null>('get_app_config', { key });
    }
    return localStorage.getItem(`xz_config_${key}`);
  },

  async setConfig(key: string, value: string): Promise<void> {
    if (isTauri()) {
      await invoke('set_app_config', { key, value });
    } else {
      localStorage.setItem(`xz_config_${key}`, value);
    }
  },
};
