/**
 * Antigravity Agent Mode — Real Backend E2E Suite
 * =================================================
 *
 * Boots the real DokTor server (which now serves the real antigravity backend at
 * /antigravity/v1) and runs 10 REAL tasks against REAL cloud LLM providers whose
 * keys are stored in the SQLite app_config table. Each task asserts that the
 * streamed/returned result contains the expected answer markers.
 *
 * These exact prompts are designed to be reusable from the real-life frontend
 * input box to confirm parity once the suite passes.
 *
 * Usage:
 *   ANTIGRAVITY_API_KEY=test-key tsx tests/antigravity-e2e/run.ts
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 3911;
const BASE = `http://localhost:${PORT}/antigravity/v1`;
const API_KEY = process.env['ANTIGRAVITY_API_KEY'] || 'test-key';
const DEFAULT_MODEL = process.env['ANTIGRAVITY_DEFAULT_MODEL'] || 'mistral-small-latest';

interface Task {
  id: number;
  name: string;
  model: string;
  prompt: string;
  system?: string;
  /** Returns true if the response text satisfies the expected answer. */
  expect: (text: string) => boolean;
  /** Human-readable description of the expected answer, for reporting. */
  expected: string;
}

const TASKS: Task[] = [
  {
    id: 1,
    name: 'Arithmetic',
    model: DEFAULT_MODEL,
    prompt: 'What is 17 multiplied by 23? Reply with just the number.',
    expected: 'contains 391',
    expect: (t) => t.replace(/[^0-9]/g, '') === '391' || t.includes('391'),
  },
  {
    id: 2,
    name: 'Factual capital',
    model: DEFAULT_MODEL,
    prompt: 'What is the capital of Australia? Reply with the city name only.',
    expected: 'mentions Canberra',
    expect: (t) => /canberra/i.test(t),
  },
  {
    id: 3,
    name: 'Acronym expansion',
    model: DEFAULT_MODEL,
    prompt: 'What does the acronym "HTTP" stand for? Reply with the full expansion.',
    expected: 'mentions HyperText Transfer Protocol',
    expect: (t) => /hyper\s*text\s*transfer\s*protocol/i.test(t),
  },
  {
    id: 4,
    name: 'Simple date reasoning',
    model: DEFAULT_MODEL,
    prompt: 'If today is Wednesday, what day of the week will it be in 10 days? Reply with the day name only.',
    expected: 'mentions Saturday',
    expect: (t) => /saturday/i.test(t),
  },
  {
    id: 5,
    name: 'List extraction',
    model: DEFAULT_MODEL,
    prompt: 'List the three primary colors of light (additive RGB). Reply as a comma-separated list.',
    expected: 'mentions red, green, and blue',
    expect: (t) => /red/i.test(t) && /green/i.test(t) && /blue/i.test(t),
  },
  {
    id: 6,
    name: 'Definition',
    model: DEFAULT_MODEL,
    prompt: 'Define "photosynthesis" in one sentence.',
    expected: 'mentions light/energy and plants/glucose',
    expect: (t) => /(light|sunlight|energy)/i.test(t) && /(plant|glucose|sugar)/i.test(t),
  },
  {
    id: 7,
    name: 'Counting',
    model: DEFAULT_MODEL,
    prompt: 'How many letters are in the word "ANTIGRAVITY"? Reply with just the number.',
    expected: 'contains 11',
    expect: (t) => t.replace(/[^0-9]/g, '') === '11' || t.includes('11'),
  },
  {
    id: 8,
    name: 'Boolean logic',
    model: DEFAULT_MODEL,
    prompt: 'Is the statement "All squares are rectangles" true or false? Reply with true or false only.',
    expected: 'says true',
    expect: (t) => /\btrue\b/i.test(t),
  },
  {
    id: 9,
    name: 'Unit conversion',
    model: DEFAULT_MODEL,
    prompt: 'How many minutes are in 2.5 hours? Reply with just the number.',
    expected: 'contains 150',
    expect: (t) => t.replace(/[^0-9]/g, '') === '150' || t.includes('150'),
  },
  {
    id: 10,
    name: 'Language translation',
    model: DEFAULT_MODEL,
    prompt: 'Translate the English word "hello" into French. Reply with the French word only.',
    expected: 'mentions bonjour',
    expect: (t) => /(bonjour|salut)/i.test(t),
  },
];

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` };
}

async function waitForServer(timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/identity`, { headers: authHeaders(), signal: AbortSignal.timeout(2000) });
      if (r.ok || r.status === 401) return; // 401 means server is up but rejects (shouldn't here)
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error('Server did not become reachable in time');
}

async function streamChat(model: string, prompt: string, system?: string): Promise<string> {
  const r = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: system,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`/chat failed ${r.status}: ${body}`);
  }
  const reader = r.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  const events: any[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    let evt = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) evt = line.slice(7).trim();
      else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        events.push({ event: evt, data });
        if (evt === 'text_delta') text += data.text;
        if (evt === 'error') throw new Error(`stream error: ${data.message}`);
      }
    }
  }
  return text;
}

async function runJob(model: string, prompt: string): Promise<string> {
  const create = await fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!create.ok) throw new Error(`/jobs create failed ${create.status}: ${await create.text()}`);
  const { job_id } = await create.json();

  // Poll until completed
  for (let i = 0; i < 120; i++) {
    const status = await fetch(`${BASE}/jobs/${job_id}`, { headers: authHeaders(), signal: AbortSignal.timeout(10000) });
    const s = await status.json();
    if (s.status === 'completed') break;
    if (s.status === 'failed') throw new Error('job failed');
    await sleep(1000);
  }

  // Fetch full events (non-stream) — server returns SSE; collect text_delta
  const events = await fetch(`${BASE}/jobs/${job_id}/events`, { headers: authHeaders(), signal: AbortSignal.timeout(30000) });
  const reader = events.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    let evt = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) evt = line.slice(7).trim();
      else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (evt === 'text_delta') text += data.text;
        if (evt === 'error') throw new Error(`job error: ${data.message}`);
      }
    }
  }
  return text;
}

interface ResultRow {
  id: number;
  name: string;
  model: string;
  passed: boolean;
  expected: string;
  got: string;
  error?: string;
}

async function main() {
  console.log(`\n=== Antigravity Real Backend E2E (model default: ${DEFAULT_MODEL}) ===\n`);

  const tsxCli = 'C:\\Users\\zephy\\Documents\\Raw-Code\\node_modules\\tsx\\dist\\cli.mjs';
  const server: ChildProcess = spawn(
    'node',
    [tsxCli, 'src/index.ts'],
    {
      cwd: 'C:\\Users\\zephy\\Documents\\Raw-Code\\server',
      env: { ...process.env, PORT: String(PORT), ANTIGRAVITY_API_KEY: API_KEY },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    },
  );
  server.stdout?.on('data', (d) => process.env['VERBOSE'] && process.stdout.write(`[server] ${d}`));
  server.stderr?.on('data', (d) => process.stderr.write(`[server:err] ${d}`));

  let rows: ResultRow[] = [];
  try {
    await waitForServer();
    console.log('Server is up.\n');

    for (const task of TASKS) {
      process.stdout.write(`Task ${task.id}/10 [${task.name}] (${task.model}) ... `);
      try {
        // Tasks 1-5 via streaming chat, 6-10 via async job pipeline
        const text = task.id <= 5 ? await streamChat(task.model, task.prompt) : await runJob(task.model, task.prompt);
        const passed = task.expect(text);
        rows.push({ id: task.id, name: task.name, model: task.model, passed, expected: task.expected, got: text.slice(0, 200) });
        console.log(passed ? 'PASS' : 'FAIL');
        if (!passed) console.log(`   expected: ${task.expected}\n   got: ${text.slice(0, 160)}`);
      } catch (e: any) {
        rows.push({ id: task.id, name: task.name, model: task.model, passed: false, expected: task.expected, got: '', error: e.message });
        console.log(`ERROR (${e.message})`);
      }
    }
  } finally {
    server.kill('SIGTERM');
  }

  const passed = rows.filter((r) => r.passed).length;
  console.log(`\n=== RESULT: ${passed}/${rows.length} passed ===\n`);
  for (const r of rows) {
    console.log(`${r.passed ? '✅' : '❌'} #${r.id} ${r.name} (${r.model})${r.passed ? '' : ` — expected ${r.expected}; got "${r.got}"`}`);
  }

  if (passed < rows.length) process.exit(1);
}

main().catch((e) => {
  console.error('Suite crashed:', e);
  process.exit(1);
});
