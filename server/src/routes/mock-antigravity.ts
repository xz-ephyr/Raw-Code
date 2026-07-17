import { Router } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

interface Job {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  updatedAt: string;
  events: AntigravityEvent[];
  model: string;
}

interface AntigravityEvent {
  event: string;
  data: Record<string, unknown>;
}

const jobs = new Map<string, Job>();

function generateJobId(): string {
  return `ag_job_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function isAuthenticated(req: any): boolean {
  const auth = req.headers.authorization as string | undefined;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7).length > 0;
}

function requireAuth(req: any, res: any, next: any) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'invalid_api_key',
      message: 'The provided API key is not valid.',
    });
  }
  next();
}

function buildMockEvents(messages: any[], model: string): AntigravityEvent[] {
  const events: AntigravityEvent[] = [];
  const userMsg = messages.find((m: any) => m.role === 'user');
  const prompt = userMsg?.content || 'hello';

  events.push({ event: 'thinking_delta', data: { id: 'thought_1', text: `Processing your request with model ${model}...` } });
  events.push({ event: 'text_delta', data: { id: 'block_1', text: `Hello! I received your message: "${prompt.slice(0, 50)}..." ` } });
  events.push({ event: 'text_delta', data: { id: 'block_1', text: 'This is a mock response from the Antigravity cloud service.' } });
  events.push({ event: 'text_delta', data: { id: 'block_1', text: ' The real backend will process this with advanced cloud resources.' } });
  events.push({ event: 'finish', data: { reason: 'stop', usage: { inputTokens: 50, outputTokens: 30 } } });
  events.push({ event: 'done', data: {} });
  return events;
}

router.get('/identity', (req, res) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'invalid_api_key',
      message: 'The provided API key is not valid.',
    });
  }
  res.json({ status: 'ok', service: 'antigravity', version: '1.0.0' });
});

router.post('/chat', requireAuth, (req, res) => {
  const { model = 'antigravity-1', messages = [], stream = true } = req.body;

  if (!messages.length) {
    return res.status(400).json({ error: 'invalid_request', message: 'messages is required' });
  }

  if (!stream) {
    const events = buildMockEvents(messages, model);
    const content = events
      .filter((e) => e.event === 'text_delta')
      .map((e) => e.data.text)
      .join('');
    return res.json({ id: `chat_${randomUUID()}`, choices: [{ message: { role: 'assistant', content } }] });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const events = buildMockEvents(messages, model);
  let idx = 0;

  const interval = setInterval(() => {
    if (idx >= events.length) {
      clearInterval(interval);
      res.end();
      return;
    }
    const evt = events[idx++];
    res.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`);
  }, 50);

  req.on('close', () => clearInterval(interval));
});

router.post('/jobs', requireAuth, (req, res) => {
  const { model = 'antigravity-1', messages = [] } = req.body;

  if (!messages.length) {
    return res.status(400).json({ error: 'invalid_request', message: 'messages is required' });
  }

  const id = generateJobId();
  const now = new Date().toISOString();
  const events = buildMockEvents(messages, model);

  const job: Job = {
    id,
    status: 'queued',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    events,
    model,
  };

  jobs.set(id, job);

  setTimeout(() => {
    job.status = 'running';
    job.progress = 0.1;
    job.updatedAt = new Date().toISOString();
  }, 500);

  setTimeout(() => {
    job.status = 'completed';
    job.progress = 1.0;
    job.updatedAt = new Date().toISOString();
  }, 2000);

  res.status(202).json({
    job_id: id,
    status: 'queued',
    created_at: now,
  });
});

router.get('/jobs/:jobId', requireAuth, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'job_not_found', message: 'Job ID does not exist' });
  }
  res.json({
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  });
});

router.get('/jobs/:jobId/events', requireAuth, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'job_not_found', message: 'Job ID does not exist' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let idx = 0;
  const interval = setInterval(() => {
    if (idx >= job.events.length) {
      clearInterval(interval);
      res.end();
      return;
    }
    const evt = job.events[idx++];
    res.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`);
  }, 50);

  req.on('close', () => clearInterval(interval));
});

router.get('/jobs/:jobId/stream', requireAuth, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'job_not_found', message: 'Job ID does not exist' });
  }

  const cursor = parseInt(req.query.cursor as string, 10) || 0;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let idx = Math.min(cursor, job.events.length);

  const interval = setInterval(() => {
    if (idx >= job.events.length) {
      clearInterval(interval);
      res.end();
      return;
    }
    const evt = job.events[idx++];
    res.write(`event: ${evt.event}\ndata: ${JSON.stringify({ ...evt.data, _cursor: idx })}\n\n`);
  }, 50);

  req.on('close', () => clearInterval(interval));
});

export default router;
