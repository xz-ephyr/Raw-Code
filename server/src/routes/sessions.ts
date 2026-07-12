import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/get_sessions', async (req, res) => {
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

router.post('/get_all_sessions', async (_req, res) => {
  const result = await query('SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions ORDER BY created_at DESC');
  res.json(result.rows.map(r => ({
    ...r,
    lastMessage: r.last_message,
    projectId: r.project_id,
    createdAt: Number(r.created_at),
    archived: Boolean(r.archived),
  })));
});

router.post('/get_session', async (req, res) => {
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

router.post('/create_session', async (req, res) => {
  const { title, lastMessage, projectId, existingId } = req.body;
  const id = existingId || crypto.randomUUID();
  const createdAt = Date.now();

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

router.post('/update_session', async (req, res) => {
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

router.post('/delete_session', async (req, res) => {
  const { id } = req.body;
  await query('DELETE FROM chat_sessions WHERE id = $1', [id]);
  res.json({ success: true });
});

export default router;
