import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('server/data/doktor.db', { readOnly: true });
const rows = db.prepare("select key, value from app_config").all();
const envMap = { 'groq-api-key':'GROQ_API_KEY','google-api-key':'GOOGLE_API_KEY','cerebras-api-key':'CEREBRAS_API_KEY','mistral-api-key':'MISTRAL_API_KEY','sambanova-api-key':'SAMBANOVA_API_KEY','huggingface-api-key':'HUGGINGFACE_API_KEY','cloudflare-api-key':'CLOUDFLARE_API_KEY','cloudflare-account-id':'CLOUDFLARE_ACCOUNT_ID','cloudflare-base-url':'CLOUDFLARE_BASE_URL','nvidia-api-key':'NVIDIA_API_KEY','deepseek-api-key':'DEEPSEEK_API_KEY','anthropic-api-key':'ANTHROPIC_API_KEY','cohere-api-key':'COHERE_API_KEY' };
for (const r of rows) { const e = envMap[r.key]; if (e && r.value && !process.env[e]) process.env[e] = r.value; }

const { ensureToolRuntimeInit, materialize } = await import('@core/tools/initToolRuntime');
const { onAnyEvent } = await import('@doktor/tool-runtime');
ensureToolRuntimeInit();
const mat = materialize({ filterBySource: ['builtin', 'content'] });
const subagent = mat.definitionsMap.get('subagent_run');
let c=0; const ctx=()=>({sessionID:'s'+c,agentID:'t',assistantMessageID:'m'+c,toolCallID:'c'+c,resolveModel:(n)=>n});
const call=async(tool,input)=>{c++;const r=await tool.settle({id:'k'+c,name:'subagent_run',input},ctx());if(r.type==='error')throw new Error(r.message);return r.value;};

onAnyEvent((e) => {
  if (e.type === 'intent') console.log('[INTENT]', JSON.stringify(e.payload).slice(0, 200));
  if (e.type === 'tool_call_end') console.log('[TOOL_END]', e.payload.toolName, e.payload.sourcesCount ? `${e.payload.sourcesCount} sources` : '');
  if (e.type === 'subagent_end') console.log('[SUBAGENT_END] text:', e.payload.text?.slice(0, 100));
});

console.log('Starting deep research task...');
const start = Date.now();
const res = await call(subagent,{
  task: 'Deep research: Analyze the current state of AI agents in software development. Cover: 1) Major frameworks (LangGraph, AutoGen, CrewAI, LlamaIndex agents), 2) Key architectural patterns (ReAct, plan-and-execute, multi-agent), 3) Production deployment considerations, 4) Open challenges. Provide concrete examples and citations.',
  agentType: 'researcher',
  model: 'mistral-small-latest',
  maxSteps: 15,
});
console.log('Completed in', Date.now()-start, 'ms');
console.log('Result length:', res.result.length);
console.log('Steps:', res.steps);
console.log('Tool calls:', res.toolCalls);
console.log('\n--- OUTPUT ---');
console.log(res.result.slice(0, 3000));