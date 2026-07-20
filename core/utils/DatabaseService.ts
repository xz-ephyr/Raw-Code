const API_BASE = () => import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function request<T>(command: string, payload: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;
  const res = await fetch(`${API_BASE()}/${command}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return await res.json();
}

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
  pinned: boolean;
  unread: boolean;
  streaming: boolean;
  createdAt: number;
  updatedAt: number | null;
}

interface MessageRow {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  reasoning: string | null;
  toolInvocations: string | null;
  model: string | null;
  createdAt: number;
  content_before_tool: string | null;
  content_after_tool: string | null;
}

export const DatabaseService = {
  // Projects
  async getProjects() {
    const rows = await request<ProjectRow[]>('get_projects', {});
    return rows.map(({ createdAt, ...rest }) => ({
      ...rest,
      createdAt: Number(createdAt),
    }));
  },

  async createProject(name: string, path: string, existingId?: string) {
    const id = existingId || crypto.randomUUID();
    const row = await request<ProjectRow>('create_project', { name, path, existingId: id });
    return { ...row, createdAt: Number(row.createdAt) };
  },

  async deleteProject(id: string) {
    await request('delete_project', { id });
  },

  // Sessions
  async getSessions(projectId?: string | null) {
    const rows = await request<SessionRow[]>('get_sessions', {
      projectId: projectId ?? null,
    });
    return rows.map(({ createdAt, updatedAt, lastMessage, projectId: pid, ...rest }) => ({
      ...rest,
      lastMessage: lastMessage ?? undefined,
      projectId: pid ?? undefined,
      createdAt: Number(createdAt),
      updatedAt: updatedAt ? Number(updatedAt) : undefined,
    }));
  },

  async getSession(id: string) {
    const row = await request<SessionRow | null>('get_session', { id });
    if (!row) return null;
    const { lastMessage, projectId: pid, createdAt, updatedAt, ...rest } = row;
    return { ...rest, lastMessage: lastMessage ?? undefined, projectId: pid ?? undefined, createdAt: Number(createdAt), updatedAt: updatedAt ? Number(updatedAt) : undefined };
  },

  async createSession(
    title: string,
    lastMessage?: string,
    projectId?: string,
    existingId?: string
  ) {
    const id = existingId || crypto.randomUUID();
    const row = await request<SessionRow>('create_session', {
      title,
      lastMessage: lastMessage || null,
      projectId: projectId || null,
      existingId: id,
    });
    return { ...row, archived: false, createdAt: Number(row.createdAt), updatedAt: Number(row.createdAt) };
  },

  async updateSession(
    id: string,
    updates: { title?: string; lastMessage?: string; archived?: boolean; pinned?: boolean; unread?: boolean; streaming?: boolean }
  ) {
    await request('update_session', {
      id,
      title: updates.title ?? null,
      lastMessage: updates.lastMessage ?? null,
      archived: updates.archived ?? null,
      pinned: updates.pinned ?? null,
      unread: updates.unread ?? null,
      streaming: updates.streaming ?? null,
    });
  },

  async touchSession(id: string) {
    await request('update_session', { id, title: null, lastMessage: null, archived: null });
  },

  async setSessionPinned(id: string, pinned: boolean) {
    await request('pin_session', { id, pinned });
  },

  async deleteSession(id: string) {
    await request('delete_session', { id });
  },

  // Messages
  async getMessages(sessionId: string, opts?: { limit?: number; offset?: number }) {
    const rows = await request<MessageRow[]>('get_messages', {
      sessionId,
      limit: opts?.limit ?? null,
      offset: opts?.offset ?? null,
    });
    return rows.map(({ sessionId: sid, toolInvocations, createdAt, content_before_tool, content_after_tool, ...rest }) => ({
      ...rest,
      sessionId: sid,
      createdAt: Number(createdAt),
      toolInvocations: toolInvocations ? JSON.parse(toolInvocations) : undefined,
      contentBeforeTool: content_before_tool || undefined,
      contentAfterTool: content_after_tool || undefined,
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
      model: m.model || null,
      createdAt: m.createdAt || Date.now(),
      contentBeforeTool: m.contentBeforeTool || null,
      contentAfterTool: m.contentAfterTool || null,
    }));
    await request('save_messages', { sessionId, messages: messagesToSave });
  },

  // Project Files
  async saveProjectFiles(projectId: string, files: { path: string; content: string }[]) {
    await request('save_project_files', { projectId, files });
  },

  async getProjectFiles(projectId: string): Promise<{ path: string; size: number }[]> {
    return await request('get_project_files', { projectId });
  },

  async getProjectFileContent(projectId: string, filePath: string): Promise<string> {
    const result = await request<{ content: string }>('get_project_file_content', { projectId, filePath });
    return result.content;
  },

  // App Config
  async getConfig(key: string): Promise<string | null> {
    try {
      return await request<string | null>('get_app_config', { key });
    } catch {
      return localStorage.getItem(`rc_config_${key}`);
    }
  },

  async setConfig(key: string, value: string): Promise<void> {
    try {
      await request('set_app_config', { key, value });
    } catch {
      localStorage.setItem(`rc_config_${key}`, value);
    }
  },

  // Project Memory
  async getProjectMemory(projectId: string): Promise<{ key: string; value: string; source: string; updatedAt: number }[]> {
    const rows = await request<any[]>('get_project_memory', { projectId });
    return rows.map(({ updated_at, ...rest }) => ({ ...rest, updatedAt: Number(updated_at) }));
  },

  async setProjectMemory(projectId: string, key: string, value: string, source: string): Promise<void> {
    await request('set_project_memory', { projectId, key, value, source });
  },

  async deleteProjectMemory(projectId: string, key: string): Promise<void> {
    await request('delete_project_memory', { projectId, key });
  },

  async clearProjectMemory(projectId: string): Promise<void> {
    await request('clear_project_memory', { projectId });
  },
};
