import { Router } from 'express';
import { query, transaction, querySync } from '../db.js';

const router = Router();

router.post('/save_project_files', async (req, res) => {
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

router.post('/get_project_files', async (req, res) => {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  const result = await query(
    'SELECT file_path, LENGTH(content) as size FROM project_files WHERE project_id = $1 ORDER BY file_path ASC',
    [projectId]
  );
  res.json(result.rows.map(r => ({ path: r.file_path, size: Number(r.size) })));
});

router.post('/get_project_file_content', async (req, res) => {
  const { projectId, filePath } = req.body;
  if (!projectId || !filePath) return res.status(400).json({ error: 'projectId and filePath required' });
  const result = await query(
    'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
    [projectId, filePath]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
  res.json({ path: filePath, content: result.rows[0].content });
});

router.post('/get_ide_files', async (_req, res) => {
  const result = await query('SELECT tree FROM ide_files WHERE id = $1', ['default']);
  if (result.rows.length === 0) return res.json({ tree: null });
  res.json({ tree: result.rows[0].tree });
});

router.post('/save_ide_files', async (req, res) => {
  const { tree } = req.body;
  if (!tree) return res.status(400).json({ error: 'tree required' });
  await query(
    'INSERT INTO ide_files (id, tree, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET tree = EXCLUDED.tree, updated_at = EXCLUDED.updated_at',
    ['default', JSON.stringify(tree), Date.now()]
  );
  res.json({ success: true });
});

export default router;
