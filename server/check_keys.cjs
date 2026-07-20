const Database = require('better-sqlite3');
const db = new Database('./data/doktor.db');
const rows = db.prepare("SELECT key, length(value) as len, CASE WHEN value='' THEN 1 ELSE 0 END as empty FROM app_config WHERE key LIKE '%mistral%' OR key LIKE '%groq%' OR key LIKE '%openai%' OR key='search-api-key'").all();
console.log(JSON.stringify(rows, null, 2));