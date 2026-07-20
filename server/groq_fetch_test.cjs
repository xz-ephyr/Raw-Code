async function main() {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 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' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Hello?' }], stream: false })
    });
    console.log('status:', res.status);
    const text = await res.text();
    console.log('body:', text.slice(0, 200));
  } catch(e) {
    console.log('ERR:', e.cause?.code || e.code || e.message);
  }
}
main().then(() => process.exit(0));
