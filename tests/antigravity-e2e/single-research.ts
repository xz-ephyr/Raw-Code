/**
 * Single deep-research task for Antigravity agent mode.
 * Exercises the REAL cloud backend with a long, multi-faceted research prompt
 * designed to take ~2 minutes of generation and return in-depth, structured results.
 *
 * Run: ANTIGRAVITY_API_KEY=test-key ANTIGRAVITY_DEFAULT_MODEL=mistral-small-latest npx tsx tests/antigravity-e2e/single-research.ts
 */
const PORT = 3911;
const BASE = `http://localhost:${PORT}/antigravity/v1`;
const API_KEY = process.env['ANTIGRAVITY_API_KEY'] || 'test-key';
const MODEL = process.env['ANTIGRAVITY_DEFAULT_MODEL'] || 'mistral-small-latest';

const RESEARCH_PROMPT = `Write a thorough, in-depth research briefing on the following topic using the web
sources already provided to you. Do NOT call any tool — the research is done; just
synthesize and write.

TOPIC: "The current state and near-term trajectory of small open-weight language models
(≤ 15B parameters) in 2026 — covering architecture trends, quantization, on-device
deployment, training efficiency, and notable model families."

Your report MUST include ALL of the following sections:
1. Executive Summary (3-5 sentences)
2. Architecture & Training Trends (with named techniques)
3. Quantization & Inference Efficiency (with concrete methods)
4. On-Device / Edge Deployment (real constraints and tradeoffs)
5. Notable Model Families (a table of at least 5 families with parametric size and vendor)
6. Risks, Limitations & Open Problems
7. 12-Month Outlook (numbered predictions)
8. Sources & Further Reading (cite the actual URLs provided to you)

Write in depth — aim for a substantial, detailed report. Do not truncate.`;

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` };
}

async function streamChat(prompt: string, model: string): Promise<{ text: string; events: any[]; usage: any }> {
  const r = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      stream: true,
      enableTools: false,
      researchQuery: 'small open-weight language models under 15B parameters 2026 trends architecture quantization on-device deployment',
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(240000),
  });
  if (!r.ok) throw new Error(`/chat failed ${r.status}: ${await r.text()}`);
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '', thinking = '';
  const events: any[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    let evt = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) evt = line.slice(7).trim();
      else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        events.push({ event: evt, data });
        if (evt === 'text_delta') text += data.text;
        else if (evt === 'thinking_delta') thinking += data.text;
        else if (evt === 'tool_call_delta') events.push({ event: 'TOOL', name: data.name });
        else if (evt === 'error') throw new Error(`stream error: ${JSON.stringify(data)}`);
      }
    }
  }
  const usageEvt = events.find((e) => e.event === 'finish');
  return { text, events, usage: usageEvt?.data?.usage ?? null };
}

async function main() {
  console.log(`\n=== Antigravity Single Deep-Research Task (model: ${MODEL}) ===\n`);
  console.log('Spawning research request to real cloud... (this will take ~2 min)\n');

  const start = Date.now();
  const { text, events, usage } = await streamChat(RESEARCH_PROMPT, MODEL);
  const elapsed = (Date.now() - start) / 1000;

  const toolCalls = events.filter((e) => e.event === 'TOOL').length;
  const textDeltas = events.filter((e) => e.event === 'text_delta').length;

  // Depth grading
  const words = text.trim().split(/\s+/).length;
  const hasSections =
    /1\.\s*Executive Summary/i.test(text) &&
    /Architecture/i.test(text) &&
    /Quantization/i.test(text) &&
    /On-Device|Edge Deployment/i.test(text) &&
    /Notable Model Families/i.test(text) &&
    /Outlook/i.test(text) &&
    /Sources|Further Reading/i.test(text);

  // Real web grounding: did the report cite actual http(s) URLs from research?
  const citedUrls = (text.match(/https?:\/\/[^\s)\]"'<>]+/g) || []).filter(
    (u) => !/localhost|example\.com/.test(u),
  );

  console.log(`Elapsed: ${elapsed.toFixed(1)}s`);
  console.log(`Words: ${words}, text_delta events: ${textDeltas}, tool_calls: ${toolCalls}`);
  console.log(`Usage: ${JSON.stringify(usage)}`);
  console.log(`All required sections present: ${hasSections}`);
  console.log(`Real cited URLs: ${citedUrls.length} -> ${citedUrls.slice(0, 5).join(', ')}`);
  console.log(`\n----- REPORT PREVIEW (first 1200 chars) -----\n${text.slice(0, 1200)}\n...`);

  const reasons: string[] = [];
  if (words <= 600) reasons.push(`report too short (${words} words)`);
  if (!hasSections) reasons.push('missing required sections');
  if (toolCalls < 1) reasons.push('model did not invoke the research tool');
  if (citedUrls.length < 3) reasons.push(`too few real cited URLs (${citedUrls.length})`);

  const pass = reasons.length === 0;
  console.log(`\n=== RESULT: ${pass ? 'PASS' : 'FAIL'} ===`);
  if (!pass) {
    console.log('Reasons:', reasons.join('; '));
    process.exit(1);
  }
}

main().catch((e) => { console.error('Task crashed:', e); process.exit(1); });
