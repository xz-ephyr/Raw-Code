import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('server/data/doktor.db', { readOnly: true });
const keys = db.prepare("select key, value from app_config where key like '%api-key%' or key like '%account-id%'").all();
const map = {};
for (const k of keys) map[k.key] = k.value;
console.log(JSON.stringify(map, null, 2));
