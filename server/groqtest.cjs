const https = require('https');
const body = JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hello, what is 2+2?' }],
  stream: true
});
const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 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',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let n=0;
  res.on('data', d => {
    const str = d.toString();
    if (n < 5) { str.split('\n').filter(l=>l.startsWith('data:')).slice(0,3).forEach(l => { console.log('RAW:', l.slice(0, 200)); n++; }); }
  });
  res.on('end', () => { console.log('=== END === Total chunks:'+n); process.exit(0); });
});
req.on('error', e => { console.log('ERR', e.message); process.exit(1); });
req.setTimeout(30000, () => { console.log('TIMEOUT'); req.destroy(); process.exit(0); });
req.end();
