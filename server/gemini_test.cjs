async function main() {
  try {
    // Test Gemini via OpenAI-compatible endpoint
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer AQ.Ab8RN6IaxAcOJHVq82cOeBGb2Mh3CZsQIr7YRC2H-XJBFoY2SA' },
      body: JSON.stringify({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'Hello?' }], stream: true })
    });
    console.log('Gemini status:', res.status);
    if (!res.ok) { const t = await res.text(); console.log('body:', t.slice(0,200)); return; }
    let n=0;
    for await (const chunk of res.body) {
      const text = new TextDecoder().decode(chunk);
      if (n < 3) { text.split('\n').filter(l=>l.startsWith('data:')&&l!=='data: [DONE]').slice(0,2).forEach(l => console.log('chunk:', l.slice(0,120))); n++; }
    }
    console.log('Gemini OK');
  } catch(e) { console.log('Gemini ERR:', e.cause?.code || e.message); }
}
main().then(() => process.exit(0));
