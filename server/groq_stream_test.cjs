const https = require('https');
const body = JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'what is the current temperature in London' }],
  stream: true,
  tools: [{
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    }
  }]
});
const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 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',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  console.log('status:', res.statusCode);
  let buf = '';
  res.on('data', d => { buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() || ''; for (const l of lines) { if (l.startsWith('data:') && l !== 'data: [DONE]') { const json = l.slice(5).trim(); if (json) { const ev = JSON.parse(json); const fc = ev.choices?.[0]?.delta?.tool_calls?.[0]?.function; const text = ev.choices?.[0]?.delta?.content; if (fc) console.log('TOOL CALL:', fc.name); else if (text) console.log('TEXT:', text.slice(0,60)); } } } });
  res.on('end', () => { console.log('=== END ==='); process.exit(0); });
});
req.on('error', e => { console.log('ERR:', e.code, e.message); process.exit(1); });
req.setTimeout(30000, () => { console.log('TIMEOUT'); req.destroy(); process.exit(0); });
req.end();
