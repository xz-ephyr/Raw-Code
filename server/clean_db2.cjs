const Database = require('better-sqlite3');
const db = new Database('data/doktor.db');
const del = db.prepare("DELETE FROM app_config WHERE key = ?");
const keys = [
  'openai-api-key','anthropic-api-key','deepseek-api-key','mistral-api-key',
  'groq-api-key','cohere-api-key','together-api-key','openrouter-api-key',
  'nvidia-api-key','cerebras-api-key','sambanova-api-key','huggingface-api-key',
  'cloudflare-api-key','cloudflare-account-id','cloudflare-base-url','xai-api-key'
];
for (const k of keys) { del.run(k); console.log('deleted:', k); }
const after = db.prepare("SELECT key FROM app_config ORDER BY key").all();
console.log('\nRemaining keys:');
after.forEach(r => console.log(' ', r.key));
db.close();
