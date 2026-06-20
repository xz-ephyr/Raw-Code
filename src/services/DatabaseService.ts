import { PGlite } from '@electric-sql/pglite';

let initPromise: Promise<PGlite> | null = null;

export async function getDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const pg = new PGlite('idb://xz-database');
    await initDb(pg);
    return pg;
  })();

  return initPromise;
}

async function initDb(pg: PGlite) {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      last_message TEXT,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      archived BOOLEAN DEFAULT FALSE,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reasoning TEXT,
      tool_invocations JSONB,
      created_at BIGINT NOT NULL
    );
  `);
}

export const DatabaseService = {
  // Projects
  async getProjects() {
    const pg = await getDb();
    const res = await pg.query('SELECT * FROM projects ORDER BY created_at DESC');
    return res.rows;
  },

  async createProject(name: string, path: string, existingId?: string) {
    const pg = await getDb();
    const id = existingId || crypto.randomUUID();
    const createdAt = Date.now();
    await pg.query(
      'INSERT INTO projects (id, name, path, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [id, name, path, createdAt]
    );
    return { id, name, path, createdAt };
  },

  async deleteProject(id: string) {
    const pg = await getDb();
    await pg.query('DELETE FROM projects WHERE id = $1', [id]);
  },

  // Sessions
  async getSessions(projectId?: string | null) {
    const pg = await getDb();
    let query = 'SELECT * FROM chat_sessions';
    const params = [];

    if (projectId === null) {
      query += ' WHERE project_id IS NULL';
    } else if (projectId) {
      query += ' WHERE project_id = $1';
      params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';
    const res = await pg.query(query, params);
    return res.rows.map(({ project_id, last_message, created_at, ...rest }: any) => ({
      ...rest,
      projectId: project_id,
      lastMessage: last_message,
      createdAt: Number(created_at)
    }));
  },

  async getSession(id: string) {
    const pg = await getDb();
    const res = await pg.query('SELECT * FROM chat_sessions WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0] as any;
    const { project_id, last_message, created_at, ...rest } = row;
    return {
      ...rest,
      projectId: project_id,
      lastMessage: last_message,
      createdAt: Number(created_at)
    };
  },

  async createSession(title: string, lastMessage?: string, projectId?: string, existingId?: string) {
    const pg = await getDb();
    const id = existingId || crypto.randomUUID();
    const createdAt = Date.now();
    await pg.query(
      'INSERT INTO chat_sessions (id, title, last_message, project_id, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
      [id, title, lastMessage || null, projectId || null, createdAt]
    );
    return { id, title, lastMessage, projectId, archived: false, createdAt };
  },

  async updateSession(id: string, updates: { title?: string; lastMessage?: string; archived?: boolean }) {
    const pg = await getDb();
    const whitelist = {
      title: 'title',
      lastMessage: 'last_message',
      archived: 'archived'
    };

    const fields = [];
    const params: any[] = [id];
    let i = 2;

    for (const [key, column] of Object.entries(whitelist)) {
      const val = (updates as any)[key];
      if (val !== undefined) {
        fields.push(`${column} = $${i++}`);
        params.push(val);
      }
    }

    if (fields.length === 0) return;

    await pg.query(
      `UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = $1`,
      params
    );
  },

  async deleteSession(id: string) {
    const pg = await getDb();
    await pg.query('DELETE FROM chat_sessions WHERE id = $1', [id]);
  },

  // Messages
  async getMessages(sessionId: string) {
    const pg = await getDb();
    const res = await pg.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    return res.rows.map((row: any) => ({
      ...row,
      sessionId: row.session_id,
      toolInvocations: row.tool_invocations ? JSON.parse(row.tool_invocations as string) : undefined
    }));
  },

  async saveMessages(sessionId: string, messages: any[]) {
    const pg = await getDb();
    const messagesToSave = messages.map(m => ({
      ...m,
      id: m.id || crypto.randomUUID(),
      createdAt: m.createdAt || Date.now()
    }));

    for (const m of messagesToSave) {
      await pg.query(
        `INSERT INTO messages (id, session_id, role, content, reasoning, tool_invocations, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           reasoning = EXCLUDED.reasoning,
           tool_invocations = EXCLUDED.tool_invocations`,
        [
          m.id,
          sessionId,
          m.role,
          m.content,
          m.reasoning || null,
          m.toolInvocations ? JSON.stringify(m.toolInvocations) : null,
          m.createdAt
        ]
      );
    }
  }
};
