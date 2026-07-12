import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/get_messages', async (req, res) => {
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

router.post('/save_messages', async (req, res) => {
  const { sessionId, messages } = req.body;
  if (messages.length === 0) return res.json({ success: true });

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

export default router;
