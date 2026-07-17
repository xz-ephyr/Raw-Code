import { DatabaseSync } from 'node:sqlite';
import type { SelfTestResult, LayerManifest } from '../types';

const layer = 'teamwork-real-tasks';

function ok(name: string, msg?: string): SelfTestResult {
  return { layer, name, status: 'pass', message: msg, durationMs: 0 };
}
function fail(name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs: 0 };
}
function skip(name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'skip', message: msg, durationMs: 0 };
}

// --- Load real API keys from the local SQLite DB into process.env so the
//     llm-providers ModelRoutesProvider (Auth.config) can resolve them. ---
function loadKeysFromDb(): string[] {
  const loaded: string[] = [];
  try {
    const db = new DatabaseSync('server/data/doktor.db', { readOnly: true });
    const rows = db
      .prepare("select key, value from app_config where key like '%api-key%' or key like '%account-id%' or key like '%base-url%'")
      .all() as Array<{ key: string; value: string }>;
    const envMap: Record<string, string> = {
      'groq-api-key': 'GROQ_API_KEY',
      'google-api-key': 'GOOGLE_API_KEY',
      'cerebras-api-key': 'CEREBRAS_API_KEY',
      'mistral-api-key': 'MISTRAL_API_KEY',
      'sambanova-api-key': 'SAMBANOVA_API_KEY',
      'huggingface-api-key': 'HUGGINGFACE_API_KEY',
      'cloudflare-api-key': 'CLOUDFLARE_API_KEY',
      'cloudflare-account-id': 'CLOUDFLARE_ACCOUNT_ID',
      'cloudflare-base-url': 'CLOUDFLARE_BASE_URL',
      'nvidia-api-key': 'NVIDIA_API_KEY',
      'deepseek-api-key': 'DEEPSEEK_API_KEY',
      'anthropic-api-key': 'ANTHROPIC_API_KEY',
      'cohere-api-key': 'COHERE_API_KEY',
    };
    for (const r of rows) {
      const env = envMap[r.key];
      if (env && r.value && !process.env[env]) {
        process.env[env] = r.value;
        loaded.push(env);
      }
    }
  } catch (e: any) {
    console.warn('[teamwork-real-tasks] key load error:', e.message);
  }
  return loaded;
}

interface TaskSpec {
  readonly id: string;
  readonly mode: 'single' | 'parallel' | 'compose';
  readonly description: string;
  // runs the task through the exact bridge tool the input box uses
  run: () => Promise<{ output: string; steps: number; mode: string }>;
  // grading: every assertion must be satisfied
  readonly mustContain: string[];
  readonly mustNotContain?: string[];
  readonly minLength?: number;
  // optional semantic checks
  readonly rubric?: (output: string) => string | null; // returns error string or null
}

function containsAll(haystack: string, needles: string[]): string[] {
  const lower = haystack.toLowerCase();
  return needles.filter((n) => !lower.includes(n.toLowerCase()));
}

// --- The 10 real teamwork tasks across single / parallel / compose modes ---
// Resolve the registered bridge tools via materialize + settle — the exact
// runtime path the AI service / input box uses when invoking a tool.
async function resolveBridge() {
  const { ensureToolRuntimeInit, materialize } = await import('@core/tools/initToolRuntime');
  ensureToolRuntimeInit();
  const mat = materialize({ filterBySource: ['builtin'] });
  const subagent = mat.definitionsMap.get('subagent_run');
  const compose = mat.definitionsMap.get('compose_run');
  if (!subagent || !compose) throw new Error('bridge tools not registered: subagent_run=' + !!subagent + ' compose_run=' + !!compose);
  const ctx = () => {
    ctxCounter++;
    return {
      sessionID: `test_session_${ctxCounter}`,
      agentID: 'tester',
      assistantMessageID: `test_msg_${ctxCounter}`,
      toolCallID: `test_call_${ctxCounter}`,
      resolveModel: (name: string) => name,
    } as any;
  };
  return {
    subagent: async (input: any) => {
      const r = await subagent.settle({ id: 'call_' + ctxCounter, name: 'subagent_run', input }, ctx());
      if (r.type === 'error') throw new Error(r.message);
      return r.value as any;
    },
    compose: async (input: any) => {
      const r = await compose.settle({ id: 'call_' + ctxCounter, name: 'compose_run', input }, ctx());
      if (r.type === 'error') throw new Error(r.message);
      return r.value as any;
    },
  };
}

function buildTasks(bridge: Awaited<ReturnType<typeof resolveBridge>>): TaskSpec[] {
  const MODEL = 'llama-3.3-70b-versatile';
  return [
    {
      id: 'T1-single-factual',
      mode: 'single',
      description: 'Single sub-agent: answer a factual question from knowledge',
      run: async () => bridge.subagent({ task: 'What is the capital of Australia? Answer in one sentence.', agentType: 'general', model: MODEL }),
      mustContain: ['canberra'],
      mustNotContain: ['sydney', 'melbourne'],
      minLength: 10,
    },
    {
      id: 'T2-single-math',
      mode: 'single',
      description: 'Single sub-agent: arithmetic reasoning',
      run: async () => bridge.subagent({ task: 'Compute 17 * 24. Reply with only the number.', agentType: 'general', model: MODEL }),
      mustContain: ['408'],
      minLength: 1,
    },
    {
      id: 'T3-parallel',
      mode: 'parallel',
      description: 'Parallel agents: 3 independent factual questions, synthesized',
      run: async () => bridge.subagent({
        tasks: [
          'What year did the Apollo 11 moon landing occur? One sentence.',
          'What is the chemical symbol for gold? One sentence.',
          'Who wrote the play Hamlet? One sentence.',
        ],
        agentType: 'general',
        model: MODEL,
      }),
      mustContain: ['1969', 'au', 'shakespeare'],
      minLength: 20,
    },
    {
      id: 'T4-parallel-conflict',
      mode: 'parallel',
      description: 'Parallel agents: conflicting answers must both be preserved in synthesis',
      run: async () => bridge.subagent({
        tasks: [
          'Name one large planet in our solar system. One word.',
          'Name a different large planet in our solar system. One word.',
        ],
        agentType: 'general',
        model: MODEL,
      }),
      mustContain: ['jupiter', 'saturn'],
      minLength: 8,
    },
    {
      id: 'T5-compose-research-write',
      mode: 'compose',
      description: 'Compose pipeline: researcher -> writer (output interpolation)',
      run: async () => bridge.compose({
        initialContext: 'The benefits of daily walking for health',
        model: MODEL,
        steps: [
          { name: 'research', agentType: 'researcher', taskTemplate: 'List 3 evidence-based health benefits of: {{__initial__}}' },
          { name: 'write', agentType: 'writer', taskTemplate: 'Write a 2-sentence public-health note using this research: {{research}}' },
        ],
      }),
      mustContain: ['walk'],
      minLength: 40,
      rubric: (o) => {
        if (!/heart|cardiovascular|weight|mood|mental|stress|sleep|blood|lung|bone/i.test(o)) {
          return 'writer output does not reflect researched health benefits';
        }
        return null;
      },
    },
    {
      id: 'T6-compose-explore-writer',
      mode: 'compose',
      description: 'Compose pipeline: explore -> writer producing titled article',
      run: async () => bridge.compose({
        initialContext: 'Renewable energy sources',
        model: MODEL,
        steps: [
          { name: 'explore', agentType: 'explore', taskTemplate: 'Name 3 types of {{__initial__}}.' },
          { name: 'write', agentType: 'writer', taskTemplate: 'Write a headline for an article covering: {{explore}}' },
        ],
      }),
      mustContain: ['solar', 'wind'],
      minLength: 15,
    },
    {
      id: 'T7-single-classification',
      mode: 'single',
      description: 'Single agent: structured classification task',
      run: async () => bridge.subagent({ task: 'Classify the sentiment of "I love this product, it is amazing" as positive, negative, or neutral. Reply with only the label.', agentType: 'general', model: MODEL }),
      mustContain: ['positive'],
      minLength: 4,
    },
    {
      id: 'T8-parallel-languages',
      mode: 'parallel',
      description: 'Parallel agents: translate a word into two languages',
      run: async () => bridge.subagent({
        tasks: [
          'Translate the English word "thank you" into Spanish. One word.',
          'Translate the English word "thank you" into French. One word.',
        ],
        agentType: 'general',
        model: MODEL,
      }),
      mustContain: ['gracias', 'merci'],
      minLength: 8,
    },
    {
      id: 'T9-compose-summary',
      mode: 'compose',
      description: 'Compose pipeline: 2 writer steps chained via interpolation',
      run: async () => bridge.compose({
        initialContext: 'The importance of reading books',
        model: MODEL,
        steps: [
          { name: 'draft', agentType: 'writer', taskTemplate: 'Write one sentence about {{__initial__}}.' },
          { name: 'polish', agentType: 'writer', taskTemplate: 'Rewrite this to be more enthusiastic, keeping the meaning: {{draft}}' },
        ],
      }),
      mustContain: ['book'],
      minLength: 20,
    },
    {
      id: 'T10-single-error-recover',
      mode: 'single',
      description: 'Single agent: handles an impossible/contradictory instruction gracefully',
      run: async () => bridge.subagent({ task: 'Square the circle and give the exact numeric area in meters. Explain briefly if it cannot be done.', agentType: 'general', model: MODEL }),
      mustContain: ['cannot', 'impossible'],
      minLength: 20,
    },
  ];
}

let ctxCounter = 0;

// --- Golden snapshot store ---
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const _d = dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = join(_d, 'teamwork-golden.json');

interface Golden {
  [id: string]: { output: string; hash: string };
}
function loadGolden(): Golden {
  if (!existsSync(GOLDEN_PATH)) return {};
  try {
    return JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8'));
  } catch {
    return {};
  }
}
function saveGolden(g: Golden) {
  mkdirSync(_d, { recursive: true });
  writeFileSync(GOLDEN_PATH, JSON.stringify(g, null, 2), 'utf-8');
}
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const teamworkRealTasksManifest: LayerManifest = {
  id: layer,
  name: 'Teamwork Real Tasks',
  description: 'Run 10 real tasks through the actual teamwork pipeline (subagentRunTool / composeRunTool) against a live model, graded by facts + golden snapshot',
  requiresFull: true,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [];
    const loaded = loadKeysFromDb();
    console.log(`  [teamwork-real-tasks] loaded ${loaded.length} API keys from DB: ${loaded.join(', ')}`);

    if (!process.env.GROQ_API_KEY) {
      return [skip(layer, 'setup', 'No GROQ_API_KEY available from DB — cannot run real tasks')];
    }

    // Resolve the bridge tools via the real runtime registry (registers content + builtin)
    const bridge = await resolveBridge();

    const golden = loadGolden();
    const newGolden: Golden = {};
    const tasks = buildTasks(bridge);

    for (const t of tasks) {
      const start = Date.now();
      try {
        const out = await t.run();
        const text = out.output ?? '';
        const dur = Date.now() - start;

        const missing = containsAll(text, t.mustContain);
        const banned = t.mustNotContain ? t.mustNotContain.filter((b) => text.toLowerCase().includes(b.toLowerCase())) : [];
        const tooShort = t.minLength && text.trim().length < t.minLength;

        let rubricErr: string | null = null;
        if (t.rubric) rubricErr = t.rubric(text);

        const h = hash(text.trim());
        const prev = golden[t.id];
        const snapshotDrift = prev ? (prev.hash === h ? 'stable' : 'DRIFT') : 'new';

        newGolden[t.id] = { output: text.trim(), hash: h };

        const problems: string[] = [];
        if (missing.length) problems.push(`missing facts: ${missing.join(', ')}`);
        if ((banned as string[]).length) problems.push(`contains banned: ${(banned as string[]).join(', ')}`);
        if (tooShort) problems.push(`too short (<${t.minLength})`);
        if (rubricErr) problems.push(rubricErr);
        if (snapshotDrift === 'DRIFT') problems.push(`golden drift vs previous run`);

        if (problems.length === 0) {
          results.push(ok(t.id, `[${t.mode}] ${t.description} — ${dur}ms, ${text.length} chars, snapshot=${snapshotDrift}`));
        } else {
          results.push(
            fail(
              t.id,
              `[${t.mode}] ${t.description}\n  output: ${text.slice(0, 200)}\n  problems: ${problems.join('; ')}`,
            ),
          );
        }
      } catch (e: any) {
        results.push(fail(t.id, `[${t.mode}] ${t.description} threw: ${String(e?.message ?? e).slice(0, 300)}`));
      }
    }

    saveGolden(newGolden);
    return results;
  },
};
