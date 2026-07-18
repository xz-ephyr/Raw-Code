/**
 * Deep Research End-to-End Test
 *
 * Tests the full research pipeline:
 * 1. Direct go-crawl call with depth=deep → real results
 * 2. LLM agent with research tool → calls go-crawl → synthesizes depth results
 *
 * Usage:
 *   npx tsx tests/deep-research-test.ts
 */

const GO_CRAWL_URL = 'http://127.0.0.1:8080'
const SERVER_URL = 'http://localhost:3001'

async function fetchServerKeys(): Promise<Map<string, string>> {
  const res = await fetch(`${SERVER_URL}/get_all_app_config`, { method: 'POST' })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  const rows: Array<{ key: string; value: string }> = await res.json()
  const map = new Map<string, string>()
  for (const r of rows) map.set(r.key, r.value)
  return map
}

const OPENAI_COMPAT_PROVIDERS = [
  { id: 'mistral', keyName: 'mistral-api-key', baseUrl: 'https://api.mistral.ai/v1', models: ['mistral-large-latest', 'mistral-small-latest'] },
  { id: 'groq', keyName: 'groq-api-key', baseUrl: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'llama-4-scout-17b-16e-instruct', 'deepseek-r1-distill-llama-70b', 'mixtral-8x7b-32768'] },
  { id: 'openai', keyName: 'openai-api-key', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o-mini', 'gpt-4o'] },
]

async function directGoCrawlTest() {
  console.log('\n=== Test 1: Direct go-crawl deep research ===\n')
  const start = Date.now()

  const res = await fetch(
    `${GO_CRAWL_URL}/v1/search?query=${encodeURIComponent('impact of artificial intelligence on healthcare in 2026')}&maxResults=10`,
    { signal: AbortSignal.timeout(120_000) },
  )
  if (!res.ok) throw new Error(`go-crawl error: ${res.status}`)
  const json = await res.json()
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)

  console.log(`Time: ${elapsed}s`)
  console.log(`Success: ${json.success}`)
  console.log(`Results: ${(json.data || []).length} sources`)

  const data = json.data || []
  if (data.length === 0) {
    console.log('WARNING: No results returned from go-crawl')
    return false
  }

  for (let i = 0; i < Math.min(data.length, 3); i++) {
    const r = data[i]
    console.log(`  ${i + 1}. ${r.title || 'Untitled'}`)
    console.log(`     URL: ${r.url || '(no url)'}`)
    console.log(`     Content: ${(r.markdown || '').slice(0, 100).replace(/\n/g, ' ')}...`)
  }

  const hasRealContent = data.some((r: any) => (r.markdown || '').length > 200)
  console.log(`\nHas substantive content (>200 chars): ${hasRealContent ? 'YES' : 'NO (mock fallback?)'}`)
  return hasRealContent
}

async function callGoCrawl(query: string, maxResults: number): Promise<string> {
  const start = Date.now()
  const res = await fetch(
    `${GO_CRAWL_URL}/v1/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { signal: AbortSignal.timeout(60_000) },
  )
  if (!res.ok) throw new Error(`go-crawl error: ${res.status}`)
  const json = await res.json()
  const data = json.data || []
  const elapsed = Date.now() - start

  const parts = data.map((r: any, i: number) =>
    `Source ${i + 1}: ${r.title || 'Untitled'}\nURL: ${r.url || ''}\nContent: ${(r.markdown || '').slice(0, 500)}`
  )
  return `[go-crawl returned ${data.length} results in ${elapsed}ms]\n\n${parts.join('\n\n')}`
}

async function agentResearchTest(baseUrl: string, apiKey: string, model: string) {
  console.log(`\n=== Test 2: LLM agent with research tool ===`)
  console.log(`API: ${baseUrl.replace(/\/v1$/, '')} | Model: ${model}\n`)

  const systemPrompt = `You are a research assistant with access to the \`research\` tool.
When asked to research a topic, call the \`research\` tool with depth="deep" and maxSources=8.
After getting results, synthesize them into a comprehensive answer.`

  const userPrompt = 'Research the environmental impact of electric vehicles vs hydrogen fuel cell vehicles. Compare both technologies across manufacturing, operation, and lifecycle emissions. Use depth research with at least 5 sources.'

  const start = Date.now()
  let stepCount = 0
  let fullResponse = ''
  let toolCallCount = 0

  async function runStep(messages: any[]): Promise<void> {
    stepCount++
    const body = {
      model,
      messages,
      max_tokens: 4096,
      tools: [{
        type: 'function',
        function: {
          name: 'research',
          description: 'Research a topic by searching the web and synthesizing findings.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The research query' },
              depth: { type: 'string', enum: ['quick', 'deep'], description: 'Research depth' },
              maxSources: { type: 'number', description: 'Max sources to return' },
            },
            required: ['query'],
          },
        },
      }],
      stream: false,
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`)

    const choice = data.choices?.[0]
    const msg = choice?.message ?? {}
    const text = msg.content ?? ''
    const toolCalls = msg.tool_calls ?? []

    console.log(`  Step ${stepCount}: ${text ? `"${text.slice(0, 80)}..."` : '(no text)'} | Tool calls: ${toolCalls.length}`)

    if (text) fullResponse += text + '\n\n'

    if (toolCalls.length > 0) {
      for (const tc of toolCalls) {
        toolCallCount++
        const args = JSON.parse(tc.function?.arguments ?? '{}')
        console.log(`  → Tool: ${tc.function?.name}`)
        console.log(`    Query: "${args.query}"`)
        console.log(`    Depth: ${args.depth || 'quick'}`)
        console.log(`    Max sources: ${args.maxSources || 5}`)

        if (tc.function?.name === 'research') {
          const results = await callGoCrawl(args.query, args.maxSources || 8)
          console.log(`    go-crawl returned results, sending back to LLM...`)

          messages.push({ role: 'assistant', content: text || null, tool_calls: [tc] })
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: results,
          })

          await runStep(messages)
          return
        }
      }
    }
  }

  await runStep([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\nTotal time: ${elapsed}s`)
  console.log(`Steps: ${stepCount}`)
  console.log(`Tool calls: ${toolCallCount}`)
  console.log(`Response length: ${fullResponse.length} chars`)
  console.log(`\n=== FINAL RESPONSE (first 600 chars) ===\n${fullResponse.slice(0, 600)}...\n`)

  if (toolCallCount === 0) {
    console.log('WARNING: LLM did not call the research tool')
    return false
  }
  if (fullResponse.length < 200) {
    console.log('WARNING: Response too short')
    return false
  }
  console.log('AGENT RESEARCH TEST: PASS')
  return true
}

async function main() {
  console.log('=== DEEP RESEARCH END-TO-END TEST ===\n')

  // Check go-crawl (with retry for transient failures)
  console.log('Checking go-crawl...')
  let goCrawlOk = false
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const healthRes = await fetch(`${GO_CRAWL_URL}/v1/search?query=ping&maxResults=1`, { signal: AbortSignal.timeout(8000) })
      const json = await healthRes.json()
      if (json.success === true) { goCrawlOk = true; break }
      console.log(`  Attempt ${attempt}: success=false (transient, retrying...)`)
    } catch {
      if (attempt < 3) console.log(`  Attempt ${attempt}: connection error (retrying...)`)
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 2000))
  }
  if (!goCrawlOk) { console.log('go-crawl: NOT REACHABLE (is it running on port 8080?)'); process.exit(1) }
  console.log('go-crawl: REACHABLE\n')

  // Fetch API keys from server DB
  console.log('Fetching API keys from server DB...')
  let keys: Map<string, string>
  try {
    keys = await fetchServerKeys()
    console.log(`Found ${keys.size} config entries in DB\n`)
  } catch (e: any) {
    console.log(`Server not reachable: ${e.message}. Pass a key via env var.`)
    process.exit(1)
  }

  // Find first available provider
  let activeProvider: { baseUrl: string; apiKey: string; model: string; id: string } | null = null
  for (const p of OPENAI_COMPAT_PROVIDERS) {
    const key = keys.get(p.keyName)
    if (key && key.length > 0) {
      activeProvider = { baseUrl: p.baseUrl, apiKey: key, model: p.models[0], id: p.id }
      break
    }
  }

  if (!activeProvider) {
    console.log('No API key found in DB. Available keys:', [...keys.entries()].filter(([k, v]) => v.length > 0).map(([k]) => k).join(', '))
    process.exit(1)
  }

  let passed = 0
  let failed = 0

  // Test 1
  try {
    const ok = await directGoCrawlTest()
    if (ok) { passed++; console.log('\n✓ TEST 1 PASS\n') }
    else { failed++; console.log('\n✗ TEST 1 FAIL (no substantive content)\n') }
  } catch (e: any) {
    failed++; console.log(`\n✗ TEST 1 FAIL: ${e.message}\n`)
  }

  // Test 2
  try {
    const ok = await agentResearchTest(activeProvider.baseUrl, activeProvider.apiKey, activeProvider.model)
    if (ok) { passed++; console.log('✓ TEST 2 PASS\n') }
    else { failed++; console.log('✗ TEST 2 FAIL\n') }
  } catch (e: any) {
    failed++; console.log(`✗ TEST 2 FAIL: ${e.message}\n`)
  }

  console.log(`=== RESULTS: ${passed} passed, ${failed} failed ===`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })
