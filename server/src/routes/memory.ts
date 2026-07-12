import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/get_project_memory', async (req, res) => {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  const result = await query(
    'SELECT key, value, source, updated_at FROM project_memory WHERE project_id = $1 ORDER BY key ASC',
    [projectId]
  );
  res.json(result.rows);
});

router.post('/set_project_memory', async (req, res) => {
  const { projectId, key, value, source } = req.body;
  if (!projectId || !key || value === undefined || value === null) {
    return res.status(400).json({ error: 'projectId, key, and value required' });
  }
  await query(
    `INSERT INTO project_memory (project_id, key, value, source, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id, key) DO UPDATE SET
       value = EXCLUDED.value,
       source = EXCLUDED.source,
       updated_at = EXCLUDED.updated_at`,
    [projectId, key, value, source || 'manual', Date.now()]
  );
  res.json({ success: true });
});

router.post('/delete_project_memory', async (req, res) => {
  const { projectId, key } = req.body;
  if (!projectId || !key) return res.status(400).json({ error: 'projectId and key required' });
  await query('DELETE FROM project_memory WHERE project_id = $1 AND key = $2', [projectId, key]);
  res.json({ success: true });
});

router.post('/clear_project_memory', async (req, res) => {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  await query('DELETE FROM project_memory WHERE project_id = $1', [projectId]);
  res.json({ success: true });
});

export default router;
