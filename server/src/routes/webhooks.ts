import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';

const router = Router();

interface JobRegistration {
  jobId: string;
  runId: number;
  repoOwner: string;
  repoName: string;
  callbackUrl: string;
  createdAt: number;
}

const jobRegistry = new Map<string, JobRegistration>();

function makeJobKey(repoOwner: string, repoName: string, runId: number): string {
  return `${repoOwner}/${repoName}/${runId}`;
}

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const sig = `sha256=${crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Register a job for webhook lookup
router.post('/webhooks/github/jobs', (req: Request, res: Response) => {
  const { jobId, runId, repoOwner, repoName, callbackUrl } = req.body;
  if (!jobId || !runId || !repoOwner || !repoName || !callbackUrl) {
    res.status(400).json({ error: 'Missing required fields: jobId, runId, repoOwner, repoName, callbackUrl' });
    return;
  }

  const key = makeJobKey(repoOwner, repoName, runId);
  jobRegistry.set(key, { jobId, runId, repoOwner, repoName, callbackUrl, createdAt: Date.now() });

  console.log(`[webhooks] Registered job ${jobId} for run ${repoOwner}/${repoName}/${runId}`);
  res.json({ ok: true });
});

// Receive GitHub webhook
router.post('/webhooks/github', async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'] as string;
  const signature = req.headers['x-hub-signature-256'] as string;
  const delivery = req.headers['x-github-delivery'] as string;
  const payload = req.body;

  if (!event || !payload) {
    res.status(400).json({ error: 'Missing event header or body' });
    return;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret && signature) {
    const raw = JSON.stringify(req.body);
    if (!verifyHmac(raw, signature, secret)) {
      console.warn(`[webhooks] Invalid HMAC signature (delivery: ${delivery})`);
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  console.log(`[webhooks] Received ${event} (delivery: ${delivery})`);

  // Only process workflow_run events
  if (event !== 'workflow_run' || payload.action !== 'completed') {
    res.json({ ok: true });
    return;
  }

  const run = payload.workflow_run;
  const repo = payload.repository;
  if (!run || !repo) {
    res.json({ ok: true });
    return;
  }

  const key = makeJobKey(repo.owner?.login || repo.owner?.name, repo.name, run.id);
  const registration = jobRegistry.get(key);

  if (!registration) {
    console.log(`[webhooks] No registration found for ${key}`);
    res.json({ ok: true });
    return;
  }

  console.log(`[webhooks] Matched job ${registration.jobId} — conclusion: ${run.conclusion}`);

  // Call the registered callback URL
  try {
    await fetch(registration.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'workflow_run.completed',
        jobId: registration.jobId,
        runId: run.id,
        status: 'completed',
        conclusion: run.conclusion,
        runUrl: run.html_url,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.warn(`[webhooks] Callback to ${registration.callbackUrl} failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Cleanup old registrations (older than 1 hour)
  const cutoff = Date.now() - 3_600_000;
  for (const [k, v] of jobRegistry) {
    if (v.createdAt < cutoff) jobRegistry.delete(k);
  }

  res.json({ ok: true });
});

export default router;
