const http = require('http');
const body = JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hello, what is 2+2?' }],
  sessionId: 'probe_' + Date.now()
});
const req = http.request('http://127.0.0.1:3001/llm/stream', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
  let buf='';
  res.on('data', d => { buf += d.toString(); let idx; while ((idx = buf.indexOf('\n\n')) !== -1) { const chunk = buf.slice(0, idx); buf = buf.slice(idx+2); const ev = (chunk.match(/event: (\w+)/)||[])[1]; let extra=''; if (ev==='text-delta'){const t=chunk.match(/\"text\":\"([^\"]*)\"/);extra=' '+(t?JSON.stringify(t[1].slice(0,70)):'')} if (ev==='error'){const m=chunk.match(/\"message\":\"([^\"]*)\"/);extra=' '+(m?m[1]:'')} if (ev==='finish'){const m=chunk.match(/\"reason\":\"([^\"]*)\"/);extra=' '+(m?m[1]:'')} console.log(ev+extra); } });
  res.on('end', () => { console.log('=== END ==='); process.exit(0); });
});
req.on('error', e => { console.log('ERR', e.message); process.exit(1); });
req.setTimeout(30000, () => { console.log('TIMEOUT'); req.destroy(); process.exit(0); });
req.write(body);
