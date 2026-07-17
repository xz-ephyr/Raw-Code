import type { SelfTestResult, LayerManifest } from '../types';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const _dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(_dirname, '..', '..', '..');

function ok(layer: string, name: string): SelfTestResult {
  return { layer, name, status: 'pass', durationMs: 0 };
}
function info(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'pass', message: msg, durationMs: 0 };
}
function fail(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs: 0 };
}

interface ProviderInfo {
  id: string;
  label: string;
  configKey: string;
  envVar: string;
}

function getProviderList(): ProviderInfo[] {
  return [
    { id: 'anthropic', label: 'Anthropic', configKey: 'anthropic-api-key', envVar: 'ANTHROPIC_API_KEY' },
    { id: 'openai', label: 'OpenAI', configKey: 'openai-api-key', envVar: 'OPENAI_API_KEY' },
    { id: 'google', label: 'Google AI Studio', configKey: 'google-api-key', envVar: 'GOOGLE_API_KEY' },
    { id: 'deepseek', label: 'DeepSeek', configKey: 'deepseek-api-key', envVar: 'DEEPSEEK_API_KEY' },
    { id: 'mistral', label: 'Mistral AI', configKey: 'mistral-api-key', envVar: 'MISTRAL_API_KEY' },
    { id: 'cohere', label: 'Cohere', configKey: 'cohere-api-key', envVar: 'COHERE_API_KEY' },
    { id: 'groq', label: 'Groq', configKey: 'groq-api-key', envVar: 'GROQ_API_KEY' },
    { id: 'together', label: 'Together', configKey: 'together-api-key', envVar: 'TOGETHER_API_KEY' },
    { id: 'openrouter', label: 'OpenRouter', configKey: 'openrouter-api-key', envVar: 'OPENROUTER_API_KEY' },
    { id: 'nvidia', label: 'NVIDIA', configKey: 'nvidia-api-key', envVar: 'NVIDIA_API_KEY' },
    { id: 'cerebras', label: 'Cerebras', configKey: 'cerebras-api-key', envVar: 'CEREBRAS_API_KEY' },
    { id: 'sambanova', label: 'SambaNova', configKey: 'sambanova-api-key', envVar: 'SAMBANOVA_API_KEY' },
    { id: 'huggingface', label: 'HuggingFace', configKey: 'huggingface-api-key', envVar: 'HUGGINGFACE_API_KEY' },
    { id: 'cloudflare', label: 'Cloudflare', configKey: 'cloudflare-api-key', envVar: 'CLOUDFLARE_API_KEY' },
  ];
}

function tryOpenDb(): { query: (sql: string, params?: any[]) => { rows: any[] } } | null {
  try {
    const dbPath = join(ROOT, 'server', 'data', 'doktor.db');
    if (!existsSync(dbPath)) return null;
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    const stmt = db.prepare('SELECT value FROM app_config WHERE key = ?');
    return {
      query: (sql: string, params?: any[]) => {
        if (sql.includes('app_config') && params) {
          const row = stmt.get(params[0]) as { value: string } | undefined;
          return { rows: row ? [row] : [] };
        }
        return { rows: [] };
      },
    };
  } catch {
    return null;
  }
}

async function checkDualStorage(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  const providers = getProviderList();
  const db = tryOpenDb();
  let dbPresent = false;

  if (db) {
    results.push(info(layer, 'Database: server/data/doktor.db accessible', 'SQLite database found'));
    dbPresent = true;
  } else {
    results.push(info(layer, 'Database: server/data/doktor.db not found', 'No stored keys — run app first to save keys'));
  }

  for (const p of providers) {
    const inEnv = !!process.env[p.envVar];
    const inDb = dbPresent ? db!.query('SELECT value FROM app_config WHERE key = ?', [p.configKey]).rows.length > 0 : false;
    const maskedEnv = inEnv ? `${(process.env[p.envVar] ?? '').slice(0, 8)}...` : '';
    const sources: string[] = [];
    if (inDb) sources.push('db');
    if (inEnv) sources.push('env');

    if (sources.length > 0) {
      results.push(ok(layer, `${p.label}: key found in ${sources.join('+')}${inEnv ? ` (env: ${maskedEnv})` : ''}`));
    } else {
      results.push(info(layer, `${p.label}: no key in db or env`, 'Add via Settings > Keys tab'));
    }
  }

  return results;
}

export const authManifest: LayerManifest = {
  id: 'auth',
  name: 'Auth & Credentials',
  description: 'Check API keys in SQLite (app_config table) and process.env for all 14 providers',
  requiresFull: false,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    return checkDualStorage('auth');
  },
};
