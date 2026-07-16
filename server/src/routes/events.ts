import { Router } from 'express';
import { querySync } from '../db.js';

const router = Router();

router.post('/append', (req, res) => {
  const { type, sessionId, agentId, timestamp, payload } = req.body;
  if (!type || !sessionId) {
    res.status(400).json({ error: 'type and sessionId are required' });
    return;
  }
  querySync(
    'INSERT INTO event_log (type, session_id, agent_id, timestamp, payload) VALUES ($1, $2, $3, $4, $5)',
    [type, sessionId, agentId ?? '', timestamp ?? Date.now(), JSON.stringify(payload ?? {})],
  );
  res.json({ ok: true });
});

router.post('/append-batch', (req, res) => {
  const events: Array<{ type: string; sessionId: string; agentId?: string; timestamp?: number; payload?: unknown }> = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: 'events array is required' });
    return;
  }
  for (const ev of events) {
    querySync(
      'INSERT INTO event_log (type, session_id, agent_id, timestamp, payload) VALUES ($1, $2, $3, $4, $5)',
      [ev.type, ev.sessionId, ev.agentId ?? '', ev.timestamp ?? Date.now(), JSON.stringify(ev.payload ?? {})],
    );
  }
  res.json({ ok: true, count: events.length });
});

router.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { rows } = querySync<{ id: number; type: string; session_id: string; agent_id: string; timestamp: number; payload: string }>(
    'SELECT id, type, session_id, agent_id, timestamp, payload FROM event_log WHERE session_id = $1 ORDER BY timestamp ASC',
    [sessionId],
  );
  res.json(rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })));
});

export default router;
