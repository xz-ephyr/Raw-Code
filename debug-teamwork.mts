import { DatabaseSync } from 'node:sqlite';
import { Effect } from 'effect';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const db = new DatabaseSync('server/data/doktor.db', { readOnly: true });
const rows = db.prepare("select key, value from app_config where key like '%api-key%' or key like '%account-id%' or key like '%base-url%'").all();
const envMap = { 'groq-api-key':'GROQ_API_KEY','google-api-key':'GOOGLE_API_KEY','cerebras-api-key':'CEREBRAS_API_KEY','mistral-api-key':'MISTRAL_API_KEY','sambanova-api-key':'SAMBANOVA_API_KEY','huggingface-api-key':'HUGGINGFACE_API_KEY','cloudflare-api-key':'CLOUDFLARE_API_KEY','cloudflare-account-id':'CLOUDFLARE_ACCOUNT_ID','cloudflare-base-url':'CLOUDFLARE_BASE_URL','nvidia-api-key':'NVIDIA_API_KEY','deepseek-api-key':'DEEPSEEK_API_KEY','anthropic-api-key':'ANTHROPIC_API_KEY','cohere-api-key':'COHERE_API_KEY' };
for (const r of rows) { const e = envMap[r.key]; if (e && r.value && !process.env[e]) process.env[e] = r.value; }

const { ensureToolRuntimeInit, materialize } = await import('@core/tools/initToolRuntime');
ensureToolRuntimeInit();
const mat = materialize({ filterBySource: ['builtin'] });
const subagent = mat.definitionsMap.get('subagent_run');
const compose = mat.definitionsMap.get('compose_run');
let c = 0;
const ctx = () => ({ sessionID:'s'+c, agentID:'t', assistantMessageID:'m'+c, toolCallID:'c'+c, resolveModel:(n)=>n });
const call = async (tool, input) => { c++; const r = await tool.settle({ id:'k'+c, name: tool===subagent?'subagent_run':'compose_run', input }, ctx()); if (r.type==='error') throw new Error(r.message); return r.value; };

async function trial(name, fn) { try { const t=Date.now(); const res = await fn(); console.log(`OK ${name} (${Date.now()-t}ms