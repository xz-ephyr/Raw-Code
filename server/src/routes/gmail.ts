import { Router } from 'express';

const router = Router();

router.post('/gmail/status', async (_req, res) => {
  try {
    const { isConnected, getEmail } = await import('../gmailService.js');
    const connected = await isConnected();
    const email = connected ? await getEmail() : null;
    res.json({ connected, email });
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/gmail/auth-url', async (req, res) => {
  try {
    const { clientId, codeChallenge, codeChallengeMethod, state } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });
    const { getAuthUrl } = await import('../gmailService.js');
    const url = await getAuthUrl(clientId, codeChallenge, codeChallengeMethod, state);
    res.json({ url });
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/gmail/exchange', async (req, res) => {
  try {
    const { code, codeVerifier } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const { exchangeCode } = await import('../gmailService.js');
    const result = await exchangeCode(code, codeVerifier || null);
    res.json(result);
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/gmail/list', async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    const { listMessages } = await import('../gmailService.js');
    const result = await listMessages(query, maxResults);
    res.json(result);
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/gmail/read', async (req, res) => {
  try {
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ error: 'messageId required' });
    const { getMessage } = await import('../gmailService.js');
    const result = await getMessage(messageId);
    res.json(result);
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/gmail/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, and body required' });
    const { sendMessage } = await import('../gmailService.js');
    const result = await sendMessage(to, subject, body);
    res.json(result);
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/gmail/disconnect', async (_req, res) => {
  try {
    const { disconnect } = await import('../gmailService.js');
    await disconnect();
    res.json({ success: true });
  } catch (error: any) {
    res.status(502).json({ error: error.message });
  }
});

export default router;
