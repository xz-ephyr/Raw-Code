import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { runAgentTask, type AntigravityEvent } from '../antigravity/runtime.js';

const router = Router();

/**
 * The model the cloud agent uses by default when a client requests the generic
 * `antigravity-1` model. Configurable via env so the "real API" can target any
 * provider whose key is stored in the DB. Falls back to whichever model routes
 * are available.
 */
const DEFAULT_CLOUD_MODEL = process.env['ANTIGRAVITY_DEFAULT_MODEL'] || 'gemini-2.5-flash';

/** Max wall-clock lifetime of an in-memory job (matches spec: 24h expiry). */
const JOB_TTL_MS = 24 * 60 * 60 * 1000;

interface Job {
  id: string;
  model: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: string;
  updatedAt: string;
  events: AntigravityEvent[];
  prompt: string;
  finished: boolean;
}

const jobs = new Map<string, Job>();
const jobTimers = new Map<string, NodeJS.Timeout>();

function generateJobId(): string {
  return `ag_job_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function resolveModel(requested: string | undefined): string {
  if (!requested || requested === 'antigravity-1') return DEFAULT_CLOUD_MODEL;
  return requested;
}

function isAuthenticated(req: Request): boolean {
  const auth = req.headers.authorization as string | undefined;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7).length > 0;
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'invalid_api_key',
      message: 'The provided API key is not valid.',
    });
  }
  next();
}

function rateLimit(req: Request): boolean {
  // Lightweight per-process limiter: 100 req/min. Replace with Redis in prod.
  const now = Date.now();
  const bucket = (req as any)._rlBucket as { count: number; reset: number } | undefined;
  if (!bucket || now > bucket.reset) {
    (req as any)._rlBucket = { count: 1, reset: now + 60_000 };
    return true;
  }
  bucket.count += 1;
  if (bucket.count > 100) return false;
  return true;
}

function writeSSE(res: Response, evt: AntigravityEvent) {
  res.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`);
}

function extractUserPrompt(messages: any[]): string {
  const userMsg = messages.find((m: any) => m.role === 'user');
  if (!userMsg) return '';
  if (typeof userMsg.content === 'string') return userMsg.content;
  if (Array.isArray(userMsg.content)) {
    return userMsg.content.map((p: any) => p.text ?? '').join('');
  }
  return JSON.stringify(userMsg.content);
}

function executeJob(job: Job, messages: any[], model: string, systemPrompt?: string) {
  job.status = 'running';
  job.updatedAt = new Date().toISOString();
  const t0 = Date.now();

  runAgentTask({
    model,
    messages,
    systemPrompt,
    onEvent: (evt) => {
      job.events.push(evt);
      if (evt.event === 'finish' || evt.event === 'error') {
        job.progress = Math.max(job.progress, 0.95);
      } else {
        job.progress = Math.min(0.9, 0.05 + (Date.now() - t0) / (30_000));
      }
    },
  })
    .then(() => {
      job.status = 'completed';
      job.progress = 1.0;
      job.finished = true;
      job.updatedAt = new Date().toISOString();
      job.events.push({ event: 'done', data: {} });
      scheduleExpiry(job);
    })
    .catch((err: any) => {
      job.status = 'failed';
      job.progress = 1.0;
      job.finished = true;
      job.updatedAt = new Date().toISOString();
      job.events.push({ event: 'error', data: { code: 'internal_error', message: String(err?.message ?? err) } });
      job.events.push({ event: 'done', data: {} });
      scheduleExpiry(job);
    });
}

function scheduleExpiry(job: Job) {
  const timer = setTimeout(() => {
    jobs.delete(job.id);
    jobTimers.delete(job.id);
  }, JOB_TTL_MS);
  jobTimers.set(job.id, timer);
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
  if (!rateLimit(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Retry after 60s.' });
  }

  const { model = 'antigravity-1', messages = [], stream = true, systemPrompt } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'invalid_request', message: 'messages is required' });
  }

  const realModel = resolveModel(model);
  const prompt = extractUserPrompt(messages);

  if (!stream) {
    runAgentTask({ model: realModel, messages, systemPrompt, onEvent: () => {} })
      .then((result) => {
        res.json({
          id: `chat_${randomUUID()}`,
          choices: [{ message: { role: 'assistant', content: result.text } }],
          usage: result.usage,
        });
      })
      .catch((err: any) => {
        res.status(500).json({ error: 'internal_error', message: String(err?.message ?? err) });
      });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  runAgentTask({
    model: realModel,
    messages,
    systemPrompt,
    onEvent: (evt) => writeSSE(res, evt),
  })
    .catch((err: any) => {
      writeSSE(res, { event: 'error', data: { code: 'internal_error', message: String(err?.message ?? err) } });
      writeSSE(res, { event: 'done', data: {} });
    })
    .finally(() => {
      if (!res.destroyed) res.end();
    });

  req.on('close', () => {
    // client disconnected; the in-flight task continues but we stop writing
  });
});

router.post('/jobs', requireAuth, (req, res) => {
  if (!rateLimit(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Retry after 60s.' });
  }

  const { model = 'antigravity-1', messages = [], systemPrompt } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'invalid_request', message: 'messages is required' });
  }

  const realModel = resolveModel(model);
  const id = generateJobId();
  const now = new Date().toISOString();

  const job: Job = {
    id,
    model: realModel,
    status: 'queued',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    events: [],
    prompt: extractUserPrompt(messages),
    finished: false,
  };

  jobs.set(id, job);

  // Simulate brief queue delay then begin real execution
  const startTimer = setTimeout(() => {
    executeJob(job, messages, realModel, systemPrompt);
  }, 400);

  jobTimers.set(`${id}:start`, startTimer);

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
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  for (const evt of job.events) writeSSE(res, evt);
  if (job.finished) {
    if (!job.events.some((e) => e.event === 'done')) writeSSE(res, { event: 'done', data: {} });
    return res.end();
  }

  const interval = setInterval(() => {
    if (job.finished) {
      if (!job.events.some((e) => e.event === 'done')) writeSSE(res, { event: 'done', data: {} });
      clearInterval(interval);
      res.end();
      return;
    }
  }, 250);

  req.on('close', () => clearInterval(interval));
});

router.get('/jobs/:jobId/stream', requireAuth, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'job_not_found', message: 'Job ID does not exist' });
  }

  const cursor = parseInt(req.query.cursor as string, 10) || 0;
  const startIdx = Math.min(Math.max(cursor, 0), job.events.length);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  for (let i = startIdx; i < job.events.length; i++) {
    writeSSE(res, { ...job.events[i], data: { ...job.events[i].data, _cursor: i + 1 } });
  }

  if (job.finished) {
    if (!job.events.some((e) => e.event === 'done')) {
      writeSSE(res, { event: 'done', data: { _cursor: job.events.length + 1 } });
    }
    return res.end();
  }

  let lastIdx = job.events.length;
  const interval = setInterval(() => {
    for (; lastIdx < job.events.length; lastIdx++) {
      writeSSE(res, { ...job.events[lastIdx], data: { ...job.events[lastIdx].data, _cursor: lastIdx + 1 } });
    }
    if (job.finished) {
      if (!job.events.some((e) => e.event === 'done')) {
        writeSSE(res, { event: 'done', data: { _cursor: job.events.length + 1 } });
      }
      clearInterval(interval);
      res.end();
      return;
    }
  }, 250);

  req.on('close', () => clearInterval(interval));
});

export default router;
