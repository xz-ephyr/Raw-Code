const BASE = 'http://localhost:3911/antigravity/v1';
const KEY = 'test-key';

// create a job
const c = await fetch(`${BASE}/jobs`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: 'Say the word CAT.' }] }),
});
const { job_id } = await c.json();
console.log('job_id', job_id);

// poll until completed
let st = '';
for (let i = 0; i < 60; i++) {
  const s = await (await fetch(`${BASE}/jobs/${job_id}`, { headers: { Authorization: `Bearer ${KEY}` } })).json();
  st = s.status;
  if (st === 'completed' || st === 'failed') break;
  await new Promise((r) => setTimeout(r, 1000));
}
console.log('status', st);

// reattach via /stream?cursor=2 — should resume from event index 2
const s = await fetch(`${BASE}/jobs/${job_id}/stream?cursor=2`, { headers: { Authorization: `Bearer ${KEY}` } });
const reader = s.body.getReader();
const dec = new TextDecoder();
let buf = '';
let count = 0;
let cursors = [];
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
      if (evt === 'text_delta') count++;
      if (data._cursor !== undefined) cursors.push(data._cursor);
    }
  }
}
console.log('reattached text_delta count:', count, 'cursors seen:', cursors.join(','));
console.log(cursors.length && Math.min(...cursors) >= 2 ? 'PASS: reattach resumed at cursor>=2' : 'FAIL: cursor not honored');
