import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/get_app_config', async (req, res) => {
  const { key } = req.body;
  const result = await query('SELECT value FROM app_config WHERE key = $1', [key]);
  res.json(result.rows.length > 0 ? result.rows[0].value : null);
});

router.post('/get_all_app_config', async (_req, res) => {
  const result = await query('SELECT key, value FROM app_config');
  res.json(result.rows);
});

router.post('/set_app_config', async (req, res) => {
  const { key, value } = req.body;
  await query(
    'INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
  res.json({ success: true });
});

export default router;
