const Database = require('better-sqlite3');
const db = new Database('data/doktor.db');
const rows = db.prepare("SELECT key, value FROM app_config").all();
rows.forEach(r => console.log(r.key, '=', r.value ? r.value.slice(0,60) : '(empty)'));
db.close();
