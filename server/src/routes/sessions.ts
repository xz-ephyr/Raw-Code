import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/get_sessions', async (req, res) => {
  const { projectId } = req.body;
  let sql: string, params: any[];
  if (projectId === null || projectId === undefined) {
    sql = 'SELECT id, title, last_message, project_id, archived, pinned, unread, streaming, created_at, updated_at FROM chat_sessions WHERE project_id IS NULL ORDER BY pinned DESC, COALESCE(updated_at, created_at) DESC';
    params = [];
  } else {
    sql = 'SELECT id, title, last_message, project_id, archived, pinned, unread, streaming, created_at, updated_at FROM chat_sessions WHERE project_id = $1 ORDER BY pinned DESC, COALESCE(updated_at, created_at) DESC';
    params = [projectId];
  }
  const result = await query(sql, params);
  res.json(result.rows.map(r => ({
    ...r,
    lastMessage: r.last_message,
    projectId: r.project_id,
    createdAt: Number(r.created_at),
    updatedAt: r.updated_at ? Number(r.updated_at) : undefined,
    archived: Boolean(r.archived),
    pinned: Boolean(r.pinned),
    unread: Boolean(r.unread),
    streaming: Boolean(r.streaming),
  })));
});

router.post('/get_all_sessions', async (_req, res) => {
  const result = await query('SELECT id, title, last_message, project_id, archived, pinned, unread, streaming, created_at, updated_at FROM chat_sessions ORDER BY pinned DESC, COALESCE(updated_at, created_at) DESC');
  res.json(result.rows.map(r => ({
    ...r,
    lastMessage: r.last_message,
    projectId: r.project_id,
    createdAt: Number(r.created_at),
    updatedAt: r.updated_at ? Number(r.updated_at) : undefined,
    archived: Boolean(r.archived),
    pinned: Boolean(r.pinned),
    unread: Boolean(r.unread),
    streaming: Boolean(r.streaming),
  })));
});

router.post('/get_session', async (req, res) => {
  const { id } = req.body;
  const result = await query('SELECT id, title, last_message, project_id, archived, pinned, unread, streaming, created_at, updated_at FROM chat_sessions WHERE id = $1', [id]);
  if (result.rows.length === 0) return res.json(null);
  const r = result.rows[0];
  res.json({
    ...r,
    lastMessage: r.last_message,
    projectId: r.project_id,
    createdAt: Number(r.created_at),
    updatedAt: r.updated_at ? Number(r.updated_at) : undefined,
    archived: Boolean(r.archived),
    pinned: Boolean(r.pinned),
    unread: Boolean(r.unread),
    streaming: Boolean(r.streaming),
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
    'INSERT INTO chat_sessions (id, title, last_message, project_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
    [id, title, lastMessage || null, projectId || null, createdAt, createdAt]
  );
  res.json({ id, title, lastMessage: lastMessage || null, projectId: projectId || null, archived: false, pinned: false, unread: false, streaming: false, createdAt, updatedAt: createdAt });
});

router.post('/update_session', async (req, res) => {
  const { id, title, lastMessage, archived, pinned, unread, streaming } = req.body;
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
    params.push(archived ? 1 : 0);
  }
  if (pinned !== undefined && pinned !== null) {
    sets.push(`pinned = $${idx++}`);
    params.push(pinned ? 1 : 0);
  }
  if (unread !== undefined && unread !== null) {
    sets.push(`unread = $${idx++}`);
    params.push(unread ? 1 : 0);
  }
  if (streaming !== undefined && streaming !== null) {
    sets.push(`streaming = $${idx++}`);
    params.push(streaming ? 1 : 0);
  }

  if (sets.length === 0) return res.json({ success: true });

  // Only bump updated_at for content changes, not metadata (unread, streaming, pinned)
  if ((title !== undefined && title !== null) || (lastMessage !== undefined && lastMessage !== null)) {
    sets.push(`updated_at = $${idx++}`);
    params.push(Date.now());
  }

  params.push(id);
  await query(`UPDATE chat_sessions SET ${sets.join(', ')} WHERE id = $${idx}`, params);
  res.json({ success: true });
});

router.post('/pin_session', async (req, res) => {
  const { id, pinned } = req.body;
  await query('UPDATE chat_sessions SET pinned = $1 WHERE id = $2', [pinned ? 1 : 0, id]);
  res.json({ success: true });
});

router.post('/delete_session', async (req, res) => {
  const { id } = req.body;
  await query('DELETE FROM chat_sessions WHERE id = $1', [id]);
  res.json({ success: true });
});

export default router;
