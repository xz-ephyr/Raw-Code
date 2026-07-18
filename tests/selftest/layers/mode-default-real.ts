import type { SelfTestResult, LayerManifest } from '../types'
import { DEFAULT_AGENT_TASKS, type AgentTask } from '../agent-tasks'

const LAYER = 'mode-default-real'

function ok(name: string, msg?: string): SelfTestResult {
  return { layer: LAYER, name, status: 'pass', message: msg, durationMs: 0 }
}
function fail(name: string, msg: string): SelfTestResult {
  return { layer: LAYER, name, status: 'fail', message: msg, durationMs: 0 }
}
function skip(name: string, msg: string): SelfTestResult {
  return { layer: LAYER, name, status: 'skip', message: msg, durationMs: 0 }
}

function perf(name: string, durationMs: number): SelfTestResult {
  return { layer: LAYER, name, status: 'pass', durationMs }
}

interface ProviderConfig {
  envVar: string
  apiUrl: string
  model: string
  buildHeaders: (key: string) => Record<string, string>
}

const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    envVar: 'OPENAI_API_KEY',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    buildHeaders: (key: string) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
  },
  anthropic: {
    envVar: 'ANTHROPIC_API_KEY',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    buildHeaders: (key: string) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }),
  },
  google: {
    envVar: 'GOOGLE_API_KEY',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    buildHeaders: (key: string) => ({ 'Content-Type': 'application/json' }),
  },
  deepseek: {
    envVar: 'DEEPSEEK_API_KEY',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    buildHeaders: (key: string) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
  },
  mistral: {
    envVar: 'MISTRAL_API_KEY',
    apiUrl: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    buildHeaders: (key: string) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
  },
}

const BASE_SYSTEM_PROMPT = `You are a sharp, direct content creation assistant. Be concise — say what matters and nothing else.

### ARTIFACTS
You MUST call the \`write_artifact\` function tool to create artifacts. Do NOT output <write_artifact> XML tags in your text — use the function-calling API directly.

Supported parameters:
- \`identifier\`: Unique kebab-case ID (reuse to update)
- \`type\`: \`markdown\` | \`doc\` | \`pptx\` | \`excel\` | \`pdf\`
- \`title\`: Human-readable name
- \`content\`: Full artifact body.

### WEB SEARCH
You have \`web_search\` (lightweight) and \`research\` (deep multi-source) tools.

### TOOL USAGE POLICY

**Tool categories by phase:**

| Phase | Primary Tools |
|-------|--------------|
| Research | \`research\`, \`research_compile\`, \`crawl_website\`, \`scrape_url\`, \`web_search\`, \`question\` |
| Create / Edit | \`write_article\`, \`edit_text\`, \`generate_script\`, \`write_artifact\` |
| Video | \`render_video\`, \`preview_video\`, \`export_video\`, \`edit_video\` |
| Distribute | Connector tools (YouTube, Gmail, Reddit, Twitter, Telegram) |
| Plan & Coordinate | \`create_plan\`, \`execute_plan\`, \`subagent_run\`, \`compose_run\` |

**Guidelines:**
- Research before writing — gather facts first
- Use sub-agents for complex multi-step content pipelines
- One content piece per message unless asked otherwise
- Use \`write_artifact\` for documents > 15 lines
- Preview video before exporting
- Compose pipeline agents for repeatable workflows

### RESPONSE STYLE: BALANCED
- Use clean markdown. Headings, lists, spacing — make it scannable.
- Answer decisively. No apologies, no disclaimers.
- Group related info into sections. One idea = one paragraph.
- If the answer is short, keep it short.`

const DEFAULT_MODE_PROMPT = `## Default Mode — Direct Tool Use

You are a general-purpose assistant with full access to all tools.

### Rules
1. Handle simple tasks directly — search the web, write articles, research topics, generate code, answer questions. Use whatever tools you need.
2. For complex multi-step tasks that require gathering lots of information from many sources and synthesizing into multiple deliverables, use \`subagent_run\` to delegate.
3. You have access to all tools — \`web_search\`, \`research\`, \`write_article\`, \`edit_text\`, \`generate_script\`, \`question\`, \`scrape_url\`, etc. Use them freely.
4. Respond directly when you know the answer without needing tools.`

function buildSystemPrompt(): string {
  return `${BASE_SYSTEM_PROMPT}\n\n${DEFAULT_MODE_PROMPT}`
}

const TOOL_DEFS: { name: string; description: string; parameters: Record<string, any> }[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information. Lightweight single-query lookup.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'The search query' }, maxResults: { type: 'number', description: 'Max results (default 5)' } }, required: ['query'] },
  },
  {
    name: 'research',
    description: 'Research a topic by searching the web and synthesizing findings.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, depth: { type: 'string', enum: ['quick', 'deep'] }, maxSources: { type: 'number' } }, required: ['query'] },
  },
  {
    name: 'write_article',
    description: 'Write a full article on any topic.',
    parameters: { type: 'object', properties: { topic: { type: 'string' }, wordCount: { type: 'number' }, format: { type: 'string', enum: ['blog', 'technical', 'general'] } }, required: ['topic'] },
  },
  {
    name: 'subagent_run',
    description: 'For complex multi-step tasks requiring lots of information from many sources and multiple deliverables.',
    parameters: { type: 'object', properties: { agentType: { type: 'string', description: 'Always "general"' }, task: { type: 'string', description: 'The full task description' } }, required: ['agentType', 'task'] },
  },
]

async function callLLM(
  config: ProviderConfig,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ content: string; toolCalls: { name: string; args: string }[] }> {
  const timeoutMs = 60_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    if (config.model.startsWith('gemini')) {
      const url = `${config.apiUrl}?key=${apiKey}`
      const body = {
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser: ${userPrompt}` }] }],
        tools: [{ functionDeclarations: TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }],
      }
      const res = await fetch(url, { method: 'POST', headers: config.buildHeaders(apiKey), body: JSON.stringify(body), signal: controller.signal })
      const data = await res.json()
      if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(data)}`)
      const candidate = data.candidates?.[0]
      if (!candidate) throw new Error('No candidate returned')
      const parts = candidate.content?.parts ?? []
      const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join('')
      const funcCalls = parts.filter((p: any) => p.functionCall).map((p: any) => ({ name: p.functionCall.name, args: JSON.stringify(p.functionCall.args ?? {}) }))
      return { content: text, toolCalls: funcCalls }
    }

    if (config.model.startsWith('claude')) {
      const body = {
        model: config.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 4096,
        tools: TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })),
      }
      const res = await fetch(config.apiUrl, { method: 'POST', headers: config.buildHeaders(apiKey), body: JSON.stringify(body), signal: controller.signal })
      const data = await res.json()
      if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${JSON.stringify(data)}`)
      const contentBlocks = data.content ?? []
      const text = contentBlocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
      const toolUses = contentBlocks.filter((b: any) => b.type === 'tool_use').map((b: any) => ({ name: b.name, args: JSON.stringify(b.input ?? {}) }))
      return { content: text, toolCalls: toolUses }
    }

    // OpenAI-compatible (openai, deepseek, mistral)
    const body = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      tools: TOOL_DEFS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
    }
    const res = await fetch(config.apiUrl, { method: 'POST', headers: config.buildHeaders(apiKey), body: JSON.stringify(body), signal: controller.signal })
    const data = await res.json()
    if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`)

    const choice = data.choices?.[0]
    const msg = choice?.message ?? {}
    const text = msg.content ?? ''
    const toolCalls = (msg.tool_calls ?? []).map((tc: any) => ({
      name: tc.function?.name ?? tc.type ?? '',
      args: tc.function?.arguments ?? '',
    }))
    return { content: text, toolCalls }
  } finally {
    clearTimeout(timer)
  }
}

function checkTask(task: AgentTask, response: { content: string; toolCalls: { name: string; args: string }[] }): { pass: boolean; detail: string } {
  const { expected } = task
  const errors: string[] = []
  const warnings: string[] = []

  const hasSubagentCall = response.toolCalls.some((tc) => tc.name === 'subagent_run')
  const content = response.content.trim()

  // Length checks
  if (expected.minLength && content.length < expected.minLength) {
    errors.push(`Response too short: ${content.length} chars (expected >= ${expected.minLength})`)
  }
  if (expected.maxLength && content.length > expected.maxLength) {
    warnings.push(`Response long: ${content.length} chars (expected <= ${expected.maxLength})`)
  }

  // Subagent delegation check — all tasks expect NO subagent for this mode
  if (expected.callsSubagent === false && hasSubagentCall) {
    errors.push(`Expected direct tool use but subagent_run was called`)
  }
  if (expected.callsSubagent && !hasSubagentCall) {
    errors.push(`Expected subagent_run call but none found`)
  }

  // Content checks
  if (expected.mustContain) {
    for (const keyword of expected.mustContain) {
      if (!content.toLowerCase().includes(keyword.toLowerCase())) {
        errors.push(`Expected content to contain "${keyword}" but it was not found`)
      }
    }
  }
  if (expected.mustNotContain) {
    for (const keyword of expected.mustNotContain) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        warnings.push(`Content unexpectedly contains "${keyword}"`)
      }
    }
  }
  if (expected.mustMatchPattern) {
    if (!expected.mustMatchPattern.test(content)) {
      errors.push(`Content does not match pattern ${expected.mustMatchPattern}`)
    }
  }

  if (errors.length > 0) {
    return { pass: false, detail: errors.join('; ') }
  }
  const detail = warnings.length > 0 ? `OK (warnings: ${warnings.join('; ')})` : 'OK'
  return { pass: true, detail }
}

async function detectProvider(): Promise<{ config: ProviderConfig; apiKey: string } | null> {
  for (const [id, cfg] of Object.entries(PROVIDERS)) {
    const key = process.env[cfg.envVar]
    if (key && key.length > 0) {
      return { config: cfg, apiKey: key }
    }
  }
  return null
}

async function runAllTasks(): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = []

  const provider = await detectProvider()
  if (!provider) {
    results.push(skip('provider-detect', 'No API key found in env. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, DEEPSEEK_API_KEY, or MISTRAL_API_KEY to run real agent tests.'))
    return results
  }

  results.push(ok('provider-detect', `Using ${provider.config.model} via ${Object.entries(PROVIDERS).find(([_, c]) => c === provider.config)?.[0] ?? 'unknown'} (env: ${provider.config.envVar.slice(0, 8)}...)`))

  const systemPrompt = buildSystemPrompt()

  for (const task of DEFAULT_AGENT_TASKS) {
    const taskName = `${task.id}: ${task.name}`
    try {
      const start = Date.now()
      const response = await callLLM(provider.config, provider.apiKey, systemPrompt, task.prompt)
      const duration = Date.now() - start

      const check = checkTask(task, response)

      if (check.pass) {
        results.push(perf(taskName, duration))
      } else {
        results.push(fail(`${taskName} (${duration}ms)`, `${check.detail} | Response: "${response.content.slice(0, 200)}..." | Tool calls: ${JSON.stringify(response.toolCalls.map((t) => t.name))}`))
      }
    } catch (e: any) {
      results.push(fail(taskName, `Execution error: ${e.message ?? String(e)}`))
    }
  }

  return results
}

export const modeDefaultRealManifest: LayerManifest = {
  id: LAYER,
  name: 'Default Mode — Real Agent',
  description: '10 real LLM calls testing default mode persona behavior (direct response vs subagent_run delegation, content quality)',
  requiresFull: true,
  requiresEnv: [],
  run: runAllTasks,
}
