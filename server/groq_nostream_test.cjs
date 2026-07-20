const https = require('https');
const body = JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hello, what is 2+2?' }],
  stream: false
});
const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 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', 'Content-Length': Buffer.byteLength(body) }
}, (res) => {
  let d='';
  res.on('data', c=>d+=c);
  res.on('end', () => { console.log('status:', res.statusCode, 'body:', d.slice(0,200)); process.exit(0); });
});
req.on('error', e => { console.log('ERR:', e.code, e.message); process.exit(1); });
req.setTimeout(30000, () => { console.log('TIMEOUT'); req.destroy(); process.exit(0); });
req.end();
