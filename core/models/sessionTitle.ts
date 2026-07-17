import { Effect } from "effect"
import { Service as LLMClient, LLMRequest, HttpOptions, SystemPart, userMessage, makeGenerationOptions, layer } from "@doktor/llm-providers"
import { getProviders } from './providerCache'
import { getModelDefinition, getStoredSelectedModel } from "@core/config/models"
import { providerRouteMap, proxyGpt4oMini } from "@core/tools/nativeRoutes"

function sanitizeForTitleInput(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^[>$]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800)
}

function titleFromHeuristics(message: string): string {
  const msg = message.trim()
  if (!msg || msg.length < 3) return 'Quick check-in'

  const lower = msg.toLowerCase()

  const greetings = ['hi', 'hello', 'hey', 'yo', 'sup']
  if (greetings.includes(lower)) return 'Quick check-in'

  interface Pattern { regex: RegExp; format: (m: RegExpMatchArray) => string }
  const patterns: Pattern[] = [
    { regex: /^(fix|debug|solve)\s+(.+)/i, format: (m) => `Fix ${m[2].slice(0, 40)}` },
    { regex: /^(implement|add|create|build|make)\s+(.+)/i, format: (m) => `Implement ${m[2].slice(0, 35)}` },
    { regex: /^(refactor|improve|optimize|clean)\s+(.+)/i, format: (m) => `Refactor ${m[2].slice(0, 35)}` },
    { regex: /^(explain|what is|how does|tell me about)\s+(.+)/i, format: (m) => `Explore ${m[2].slice(0, 40)}` },
    { regex: /^how\s+(do i|to|can i)\s+(.+)/i, format: (m) => `How to ${m[2].slice(0, 40)}` },
    { regex: /^why\s+(is|does|did|are)\s+(.+)/i, format: (m) => `Why ${m[2].slice(0, 40)}` },
    { regex: /^(write|generate)\s+(.+)/i, format: (m) => `Write ${m[2].slice(0, 40)}` },
    { regex: /^(update|change|modify)\s+(.+)/i, format: (m) => `Update ${m[2].slice(0, 40)}` },
    { regex: /^(test|testing)\s+(.+)/i, format: (m) => `Test ${m[2].slice(0, 40)}` },
    { regex: /^(review|check)\s+(.+)/i, format: (m) => `Review ${m[2].slice(0, 40)}` },
    { regex: /^(setup|set up|configure)\s+(.+)/i, format: (m) => `Setup ${m[2].slice(0, 38)}` },
  ]

  for (const { regex, format } of patterns) {
    const match = lower.match(regex)
    if (match) {
      const title = format(match)
      return title.charAt(0).toUpperCase() + title.slice(1)
    }
  }

  const filler = new Set(['the', 'a', 'an', 'this', 'my', 'please', 'can', 'you', 'i', 'want', 'to', 'need', 'is', 'it', 'for', 'of', 'in', 'on', 'with', 'do', 'does', 'we', 'me', 'help'])
  const words = msg.split(/\s+/).filter(w => !filler.has(w.toLowerCase()))
  if (words.length > 0) {
    const title = words.slice(0, 5).join(' ')
    return title.length > 50 ? title.slice(0, 47) + '...' : title.charAt(0).toUpperCase() + title.slice(1)
  }

  return 'Code assistance'
}

function tryParseTitle(raw: string): string | null {
  const trimmed = raw.trim()
  const stripped = trimmed.replace(/^```(?:json)?\s*\n?|```$/g, '').trim()
  try {
    const parsed = JSON.parse(stripped)
    if (parsed && typeof parsed.title === 'string' && parsed.title.trim()) return parsed.title.trim()
  } catch { /* not JSON */ }
  const cleaned = stripped.replace(/^["']|["']$/g, '').replace(/^title[:\s]*/i, '').trim()
  if (cleaned) return cleaned
  return null
}

async function generateTitleNative(message: string, projectId?: string): Promise<string | null> {
  const sanitized = sanitizeForTitleInput(message)
  if (!sanitized) return null

  const prompt = `Generate a concise, sentence-case title (3-7 words) that captures the main topic or goal of this conversation. The title should be clear enough that the user recognizes the conversation in a list. Use sentence case: capitalize only the first word and proper nouns.

Return JSON with a single "title" field.

Good examples:
{"title": "Fix login button on mobile"}
{"title": "Add OAuth authentication"}
{"title": "Debug failing CI tests"}
{"title": "Refactor API client error handling"}

Bad (too vague): {"title": "Code changes"}
Bad (too long): {"title": "Investigate and fix the issue where the login button does not respond on mobile devices"}
Bad (wrong case): {"title": "Fix Login Button On Mobile"}

Message:
${sanitized}`

  const rawModel = getStoredSelectedModel()
  const selectedModel = rawModel === 'auto' ? 'gpt-4o-mini' : rawModel
  const def = getModelDefinition(selectedModel)
  const providerId = def?.provider || "openai"
  const configKey = `${providerId}-api-key`

  let apiKey = ""
  try {
    const providers = await getProviders(projectId)
    const client = providers.get(providerId)
    if (client && typeof (client as any).apiKey === "string") {
      apiKey = (client as any).apiKey
    }
  } catch { /* fallback */ }
  if (!apiKey && typeof localStorage !== "undefined") {
    apiKey = localStorage.getItem(configKey) || localStorage.getItem("openai_api_key") || ""
  }
  if (!apiKey) return null

  const route = providerRouteMap[providerId] || proxyGpt4oMini
  const model = route.model({ id: selectedModel })

  const request = new LLMRequest({
    model,
    system: [SystemPart.make("You are a helpful assistant that generates concise conversation titles.")],
    messages: [userMessage(prompt)],
    tools: [],
    toolChoice: undefined,
    generation: makeGenerationOptions({ maxTokens: 100, temperature: 0.3 }),
    http: apiKey ? new HttpOptions({ headers: { authorization: `Bearer ${apiKey}` } }) : undefined,
  })

  const clientLayer = layer([route])

  try {
    const response = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* LLMClient
        return yield* client.generate(request)
      }).pipe(Effect.provide(clientLayer))
    )

    const text = response.text
    const title = tryParseTitle(text)
    if (title && title.length <= 80) return title
  } catch (e) {
    console.warn("Native title generation failed:", e)
  }

  return null
}

export async function generateSessionTitle(userMessage: string): Promise<string> {
  const sanitized = sanitizeForTitleInput(userMessage)
  if (!sanitized) return 'New conversation'

  const titleResult = await generateTitleNative(sanitized)

  if (titleResult) return titleResult

  return titleFromHeuristics(sanitized)
}