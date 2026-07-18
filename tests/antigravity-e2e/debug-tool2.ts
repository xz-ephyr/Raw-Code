const BASE = 'http://localhost:3911/antigravity/v1';
const KEY = 'test-key';
const r = await fetch(`${BASE}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ model: 'llama-3.3-70b-versatile', stream: true, enableTools: true, forceTools: true, messages: [{ role: 'user', content: 'Use the research tool to look up the benefits of walking, then summarize.' }] }),
});
console.log('status', r.status);
const reader = r.body.getReader();
const dec = new TextDecoder();
let buf = '';
const types = {};
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
      types[evt] = (types[evt] || 0) + 1;
      if (evt === 'tool_call_delta' || evt === 'tool_result_delta') console.log(evt, (line.slice(6)));
      if (evt === 'error') console.log('ERROR', line.slice(6));
    }
  }
}
console.log('EVENT TYPES:', JSON.stringify(types));
