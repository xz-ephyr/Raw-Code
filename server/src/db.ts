import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'raw-code.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const stmtCache = new Map<string, Database.Statement>();

function prepare(sql: string): Database.Statement {
  let stmt = stmtCache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    stmtCache.set(sql, stmt);
  }
  return stmt;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: any[],
): Promise<{ rows: T[] }> {
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
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_id ON chat_sessions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reasoning TEXT,
      tool_invocations TEXT,
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
  `);
  console.log('Migration complete');
}
