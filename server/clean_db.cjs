const Database = require('better-sqlite3');
const db = new Database('data/doktor.db');

// List all keys before deletion
const before = db.prepare("SELECT key, SUBSTR(value,1,20) as val_preview FROM app_config ORDER BY key").all();
console.log('BEFORE:');
before.forEach(r => console.log(' ', r.key, '=', r.val_preview));

// Delete LLM provider API keys (keep google, search, connector keys)
const llmKeys = [
  'openai-api-key', 'anthropic-api-key', 'deepseek-api-key', 'mistral-api-key',
  'groq-api-key', 'cohere-api-key', 'together-api-key', 'openrouter-api-key',
  'nvidia-api-key', 'cerebras-api-key', 'sambanova-api-key', 'huggingface-api-key',
  'cloudflare-api-key', 'cloudflare-account-id', 'cloudflare-base-url', 'xai-api-key'
];

const del = db.prepare('DELETE FROM app_config WHERE key = ?');
const tx = db.transaction(() => {
  for (const k of llmKeys) {
    del.run(k);
  }
});
tx.run();

console.log('\nAFTER:');
const after = db.prepare("SELECT key, SUBSTR(value,1,20) as val_preview FROM app_config ORDER BY key").all();
after.forEach(r => console.log(' ', r.key, '=', r.val_preview));

db.close();
