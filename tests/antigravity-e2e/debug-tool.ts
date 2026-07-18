const BASE = 'http://localhost:3911/antigravity/v1';
const KEY = 'test-key';
const r = await fetch(`${BASE}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ model: 'mistral-small-latest', stream: true, enableTools: true, messages: [{ role: 'user', content: 'Research the benefits of walking. Use the research tool.' }] }),
});
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
      const data = JSON.parse(line.slice(6));
      if (evt === 'error') console.log('ERROR EVENT', JSON.stringify(data));
    }
  }
}
console.log('done');
