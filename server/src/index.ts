import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { query, migrate, transaction, querySync } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
app.use(auth);

// --- Projects ---

app.post('/get_projects', async (_req, res) => {
  const result = await query('SELECT id, name, path, created_at FROM projects ORDER BY created_at DESC');
  res.json(result.rows.map(r => ({ ...r, createdAt: Number(r.created_at) })));
});

app.post('/create_project', async (req, res) => {
  const { name, path, existingId } = req.body;
  const id = existingId || uuidv4();
  const createdAt = Date.now();
  await query(
    'INSERT INTO projects (id, name, path, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
    [id, name, path, createdAt]
  );
  res.json({ id, name, path, createdAt });
});

app.post('/delete_project', async (req, res) => {
  const { id } = req.body;
  await query('DELETE FROM projects WHERE id = $1', [id]);
  res.json({ success: true });
});

// --- Project Files ---

app.post('/save_project_files', async (req, res) => {
  const { projectId, files } = req.body;
  if (!projectId || !Array.isArray(files)) {
    return res.status(400).json({ error: 'projectId and files array required' });
  }
  const now = Date.now();
  const upsert = `INSERT INTO project_files (project_id, file_path, content, updated_at) VALUES ($1, $2, $3, $4)
                  ON CONFLICT (project_id, file_path) DO UPDATE SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at`;

  try {
    transaction(() => {
      for (const f of files) {
        querySync(upsert, [projectId, f.path, f.content, now]);
      }
    });
  } catch (e: any) {
    console.error('Error in save_project_files:', e);
    return res.status(500).json({ error: 'Failed to save project files' });
  }

  res.json({ success: true });
});

app.post('/get_project_files', async (req, res) => {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  const result = await query(
    'SELECT file_path, LENGTH(content) as size FROM project_files WHERE project_id = $1 ORDER BY file_path ASC',
    [projectId]
  );
  res.json(result.rows.map(r => ({ path: r.file_path, size: Number(r.size) })));
});

app.post('/get_project_file_content', async (req, res) => {
  const { projectId, filePath } = req.body;
  if (!projectId || !filePath) return res.status(400).json({ error: 'projectId and filePath required' });
  const result = await query(
    'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
    [projectId, filePath]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
  res.json({ path: filePath, content: result.rows[0].content });
});

// --- IDE Files ---

app.post('/get_ide_files', async (_req, res) => {
  const result = await query('SELECT tree FROM ide_files WHERE id = $1', ['default']);
  if (result.rows.length === 0) return res.json({ tree: null });
  res.json({ tree: result.rows[0].tree });
});

app.post('/save_ide_files', async (req, res) => {
  const { tree } = req.body;
  if (!tree) return res.status(400).json({ error: 'tree required' });
  await query(
    'INSERT INTO ide_files (id, tree, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET tree = EXCLUDED.tree, updated_at = EXCLUDED.updated_at',
    ['default', JSON.stringify(tree), Date.now()]
  );
  res.json({ success: true });
});

// --- Sessions ---

app.post('/get_sessions', async (req, res) => {
  const { projectId } = req.body;
  let sql: string, params: any[];
  if (projectId === null || projectId === undefined) {
    sql = 'SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions WHERE project_id IS NULL ORDER BY created_at DESC';
    params = [];
  } else {
    sql = 'SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions WHERE project_id = $1 ORDER BY created_at DESC';
    params = [projectId];
  }
  const result = await query(sql, params);
  res.json(result.rows.map(r => ({
    ...r,
    lastMessage: r.last_message,
    projectId: r.project_id,
    createdAt: Number(r.created_at),
    archived: Boolean(r.archived),
  })));
});

app.post('/get_all_sessions', async (_req, res) => {
  const result = await query('SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions ORDER BY created_at DESC');
  res.json(result.rows.map(r => ({
    ...r,
    lastMessage: r.last_message,
    projectId: r.project_id,
    createdAt: Number(r.created_at),
    archived: Boolean(r.archived),
  })));
});

app.post('/get_session', async (req, res) => {
  const { id } = req.body;
  const result = await query('SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions WHERE id = $1', [id]);
  if (result.rows.length === 0) return res.json(null);
  const r = result.rows[0];
  res.json({
    ...r,
    lastMessage: r.last_message,
    projectId: r.project_id,
    createdAt: Number(r.created_at),
    archived: Boolean(r.archived),
  });
});

app.post('/create_session', async (req, res) => {
  const { title, lastMessage, projectId, existingId } = req.body;
  const id = existingId || uuidv4();
  const createdAt = Date.now();

  // If tied to a project, ensure the project exists first
  if (projectId) {
    await query(
      `INSERT INTO projects (id, name, path, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [projectId, projectId, '', Date.now()]
    );
  }

  await query(
    'INSERT INTO chat_sessions (id, title, last_message, project_id, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
    [id, title, lastMessage || null, projectId || null, createdAt]
  );
  res.json({ id, title, lastMessage: lastMessage || null, projectId: projectId || null, archived: false, createdAt });
});

app.post('/update_session', async (req, res) => {
  const { id, title, lastMessage, archived } = req.body;
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (title !== undefined && title !== null) {
    sets.push(`title = $${idx++}`);
    params.push(title);
  }
  if (lastMessage !== undefined && lastMessage !== null) {
    sets.push(`last_message = $${idx++}`);
    params.push(lastMessage);
  }
  if (archived !== undefined && archived !== null) {
    sets.push(`archived = $${idx++}`);
    params.push(archived);
  }

  if (sets.length === 0) return res.json({ success: true });

  params.push(id);
  await query(`UPDATE chat_sessions SET ${sets.join(', ')} WHERE id = $${idx}`, params);
  res.json({ success: true });
});

app.post('/delete_session', async (req, res) => {
  const { id } = req.body;
  await query('DELETE FROM chat_sessions WHERE id = $1', [id]);
  res.json({ success: true });
});

// --- Messages ---

app.post('/get_messages', async (req, res) => {
  const { sessionId, limit, offset } = req.body;
  let sql = 'SELECT id, session_id, role, content, reasoning, tool_invocations, created_at FROM messages WHERE session_id = $1 ORDER BY created_at ASC';
  const params: any[] = [sessionId];
  if (limit != null) {
    sql += ' LIMIT $2';
    params.push(limit);
    if (offset != null) {
      sql += ' OFFSET $3';
      params.push(offset);
    }
  }
  const result = await query(sql, params);
  res.json(result.rows.map(r => ({
    ...r,
    sessionId: r.session_id,
    createdAt: Number(r.created_at),
    toolInvocations: r.tool_invocations,
  })));
});

app.post('/save_messages', async (req, res) => {
  const { sessionId, messages } = req.body;
  if (messages.length === 0) return res.json({ success: true });

  // Ensure the session exists — handles stale client state after server restart
  await query(
    `INSERT INTO chat_sessions (id, title, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [sessionId, 'Recovered Session', Date.now()]
  );

  const placeholders: string[] = [];
  const params: any[] = [];
  let idx = 1;

  for (const m of messages) {
    placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6})`);
    params.push(m.id, sessionId, m.role, m.content || '', m.reasoning, m.toolInvocations || null, m.createdAt);
    idx += 7;
  }

  await query(
    `INSERT INTO messages (id, session_id, role, content, reasoning, tool_invocations, created_at)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (id) DO UPDATE SET
       content = EXCLUDED.content,
       reasoning = EXCLUDED.reasoning,
       tool_invocations = EXCLUDED.tool_invocations`,
    params
  );
  res.json({ success: true });
});

// --- App Config ---

app.post('/get_app_config', async (req, res) => {
  const { key } = req.body;
  const result = await query('SELECT value FROM app_config WHERE key = $1', [key]);
  res.json(result.rows.length > 0 ? result.rows[0].value : null);
});

app.post('/get_all_app_config', async (_req, res) => {
  const result = await query('SELECT key, value FROM app_config');
  res.json(result.rows);
});

app.post('/set_app_config', async (req, res) => {
  const { key, value } = req.body;
  await query(
    'INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
  res.json({ success: true });
});

// --- Web Search ---

app.post('/websearch', async (req, res) => {
  try {
    const { tool, params } = req.body;

    const { webSearch, fetchPage, imageSearch, newsSearch } = await import('./searchService.js');

    let result;
    switch (tool) {
      case 'webSearch':
        result = await webSearch(params);
        break;
      case 'fetchPage':
        result = await fetchPage(params);
        break;
      case 'imageSearch':
        result = await imageSearch(params);
        break;
      case 'newsSearch':
        result = await newsSearch(params);
        break;
      default:
        return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Web search error:', error.message);
    res.status(502).json({ error: error.message || 'Search request failed.' });
  }
});

// --- Startup ---

async function start() {
  await migrate();
  app.listen(PORT, () => {
    console.log(`raw-code server running on http://localhost:${PORT}`);
  });
}

start();
