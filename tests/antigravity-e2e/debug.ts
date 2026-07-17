const BASE = 'http://localhost:3911/antigravity/v1';
const KEY = 'test-key';
const r = await fetch(`${BASE}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({
    model: 'gemini-2.5-flash',
    stream: true,
    messages: [{ role: 'user', content: 'Say hi in one word.' }],
  }),
});
console.log('status', r.status);
const reader = r.body.getReader();
const dec = new TextDecoder();
let buf = '';
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
      const data = line.slice(6);
      console.log(evt, '=>', data);
    }
  }
}
