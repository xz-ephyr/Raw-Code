import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'doktor.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const STMT_CACHE_LIMIT = 100;
const stmtCache = new Map<string, Database.Statement>();

function prepare(sql: string): Database.Statement {
  let stmt = stmtCache.get(sql);
  if (stmt) {
    // True LRU: move to newest position on hit
    stmtCache.delete(sql);
    stmtCache.set(sql, stmt);
    return stmt;
  }

  if (stmtCache.size >= STMT_CACHE_LIMIT) {
    const firstKey = stmtCache.keys().next().value;
    if (firstKey !== undefined) stmtCache.delete(firstKey);
  }
  stmt = db.prepare(sql);
  stmtCache.set(sql, stmt);
  return stmt;
}

/**
 * Executes the given function within a synchronous database transaction.
 * IMPORTANT: The callback MUST be synchronous. better-sqlite3 transactions
 * will commit immediately upon the function returning.
 */
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

export function querySync<T = Record<string, unknown>>(
  text: string,
  params?: any[],
): { rows: T[] } {
  const sql = text.replace(/\$(\d+)/g, '?');
  const trimmed = text.trimStart().toUpperCase();
  const returnsRows = trimmed.startsWith('SELECT')
    || trimmed.startsWith('WITH')
    || trimmed.includes('RETURNING');

  const stmt = prepare(sql);

  if (returnsRows) {
    const rows = (params ? stmt.all(...params) : stmt.all()) as T[];
    return { rows };
  }

  if (params) {
    stmt.run(...params);
  } else {
    stmt.run();
  }
  return { rows: [] as T[] };
}

export async function getAppConfig(key: string): Promise<string | null> {
  try {
    const result = await query<{ value: string }>(
      'SELECT value FROM app_config WHERE key = $1',
      [key]
    );
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch {
    return null;
  }
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: any[],
): Promise<{ rows: T[] }> {
  return querySync<T>(text, params);
}

export async function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      last_message TEXT,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      streaming INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_id ON chat_sessions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reasoning TEXT,
      tool_invocations TEXT,
      model TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS search_cache (
      cache_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      tool TEXT NOT NULL,
      results TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_search_cache_ttl ON search_cache(tool, created_at);

    CREATE TABLE IF NOT EXISTS project_files (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (project_id, file_path)
    );

    CREATE TABLE IF NOT EXISTS ide_files (
      id TEXT PRIMARY KEY,
      tree TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_memory (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (project_id, key)
    );

    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at INTEGER,
      scope TEXT,
      email TEXT,
      connected INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);

  // Schema migrations for existing tables
  try { db.exec('ALTER TABLE chat_sessions ADD COLUMN updated_at INTEGER'); } catch { /* column may already exist */ }

  // OAuth tokens schema migration: email → identity + metadata
  try { db.exec('ALTER TABLE oauth_tokens RENAME COLUMN email TO identity'); } catch { /* column may already be renamed or doesn't exist */ }
  try { db.exec("ALTER TABLE oauth_tokens ADD COLUMN metadata TEXT DEFAULT '{}'"); } catch { /* column may already exist */ }

  // Schema migration: add model column to messages
  try { db.exec('ALTER TABLE messages ADD COLUMN model TEXT'); } catch { /* column may already exist */ }

  // Schema migration: add content_before_tool and content_after_tool columns
  try { db.exec('ALTER TABLE messages ADD COLUMN content_before_tool TEXT'); } catch { /* column may already exist */ }
  try { db.exec('ALTER TABLE messages ADD COLUMN content_after_tool TEXT'); } catch { /* column may already exist */ }

  // Schema migration: add pinned and unread columns to chat_sessions
  try { db.exec('ALTER TABLE chat_sessions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0'); } catch { /* column may already exist */ }
  try { db.exec('ALTER TABLE chat_sessions ADD COLUMN unread INTEGER NOT NULL DEFAULT 0'); } catch { /* column may already exist */ }
  try { db.exec('ALTER TABLE chat_sessions ADD COLUMN streaming INTEGER NOT NULL DEFAULT 0'); } catch { /* column may already exist */ }

  // Crawl cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS crawl_cache (
      cache_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'firecrawl',
      content TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      ttl_seconds INTEGER NOT NULL DEFAULT 3600
    );
  `);

  // Migration complete
}
