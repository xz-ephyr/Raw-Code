const https = require('https');
const body = JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hello, what is 2+2?' }],
  stream: true
});
const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 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', 'Content-Length': Buffer.byteLength(body) }
}, (res) => {
  console.log('status:', res.statusCode);
  let buf = '';
  res.on('data', d => { buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop()||''; for (const l of lines) { if (l.startsWith('data:') && l !== 'data: [DONE]') { const json = l.slice(5).trim(); if(json){const ev=JSON.parse(json);const t=ev.choices?.[0]?.delta?.content;if(t)console.log('TEXT:', t.slice(0,60));if(ev.choices?.[0]?.finish_reason)console.log('FINISH:', ev.choices[0].finish_reason);} } } });
  res.on('end', () => { console.log('=== END ==='); process.exit(0); });
});
req.on('error', e => { console.log('ERR:', e.code, e.message); process.exit(1); });
req.setTimeout(30000, () => { console.log('TIMEOUT'); req.destroy(); process.exit(0); });
req.end();
