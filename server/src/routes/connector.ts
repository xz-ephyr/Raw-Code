import { Router } from 'express';
import { registry } from '../connectors/registry.js';

const router = Router();

router.post('/connector/:provider/:action', async (req, res) => {
  const { provider, action } = req.params;
  const service = registry.get(provider);
  if (!service) return res.status(404).json({ error: `Unknown provider: ${provider}` });

  const handlers = service.getActionHandlers();
  const handler = handlers[action];
  if (!handler) return res.status(400).json({ error: `Unknown action: ${action} for ${provider}` });

  try {
    const result = await handler(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/connectors/status', async (_req, res) => {
  try {
    const providers = registry.getProviders();
    const results: Record<string, { connected: boolean; identity: string | null }> = {};
    for (const p of providers) {
      const service = registry.get(p)!;
      try {
        results[p] = await service.getStatus();
      } catch {
        results[p] = { connected: false, identity: null };
      }
    }
    res.json(results);
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

export default router;
