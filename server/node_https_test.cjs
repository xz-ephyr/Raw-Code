const https = require('https');
const req = https.get('https://api.groq.com/openai/v1/models', {
  headers: { 'Authorization': 'Bearer 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' }
}, (res) => {
  let d='';
  res.on('data', c => d+=c);
  res.on('end', () => { console.log('status:', res.statusCode, 'body:', d.slice(0,100)); process.exit(0); });
});
req.on('error', e => { console.log('ERR:', e.code, e.message); process.exit(1); });
req.setTimeout(15000, () => { console.log('TIMEOUT'); req.destroy(); process.exit(0); });
