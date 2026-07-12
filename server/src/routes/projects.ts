import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/get_projects', async (_req, res) => {
  const result = await query('SELECT id, name, path, created_at FROM projects ORDER BY created_at DESC');
  res.json(result.rows.map(r => ({ ...r, createdAt: Number(r.created_at) })));
});

router.post('/create_project', async (req, res) => {
  const { name, path, existingId } = req.body;
  const id = existingId || crypto.randomUUID();
  const createdAt = Date.now();
  await query(
    'INSERT INTO projects (id, name, path, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
    [id, name, path, createdAt]
  );
  res.json({ id, name, path, createdAt });
});

router.post('/delete_project', async (req, res) => {
  const { id } = req.body;
  await query('DELETE FROM projects WHERE id = $1', [id]);
  res.json({ success: true });
});

export default router;
