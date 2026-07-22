import { Effect, Stream } from "effect"
import type { AnyRoute } from "@doktor/llm-providers/route"
import { LLMRequest, userMessage, makeGenerationOptions } from "@doktor/llm-providers/schema"
import { modelRouteMap, googleRouteForModel } from "@core/tools/nativeRoutes"
import { getProviders } from "./providerCache"

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

const RUNTIME = {
  http: {
    execute: (url: string, body: string, headers: Record<string, string>) =>
      Effect.tryPromise({
        try: async () => {
          const res = await fetch(url, { method: "POST", headers, body })
          return {
            status: res.status,
            headers: Object.fromEntries(res.headers.entries()),
            text: Effect.promise(() => res.text()),
            stream: res.body,
          }
        },
        catch: (err) => new Error(`HTTP request failed: ${err}`),
      }),
  },
}

function selectRoute(modelName: string): AnyRoute {
  return modelRouteMap[modelName] || googleRouteForModel(modelName)
}

async function generateTitleNative(message: string, responseContext?: string): Promise<string | null> {
  const sanitized = sanitizeForTitleInput(message)
  if (!sanitized) return null

  const contextSection = responseContext
    ? `\nFirst response from assistant:\n${sanitizeForTitleInput(responseContext).slice(0, 600)}`
    : ''

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

User message:
${sanitized}${contextSection}`

  let apiKey = ""
  try {
    const providers = await getProviders()
    const client = providers.get("google")
    if (client && typeof (client as any).apiKey === "string") {
      apiKey = (client as any).apiKey
    }
  } catch { /* fallback */ }
  if (!apiKey && typeof localStorage !== "undefined") {
    apiKey = localStorage.getItem("rc_config_google-api-key") || localStorage.getItem("google-api-key") || ""
  }
  if (!apiKey) return null

  try {
    const route = selectRoute("gemini-2.5-flash")
    const model = route.model({ provider: route.provider ?? "google", id: route.id })

    const request = new LLMRequest({
      model,
      system: [],
      messages: [userMessage(prompt)],
      tools: [],
      generation: makeGenerationOptions({ maxTokens: 100, temperature: 0.3 }),
    })

    const merged = {
      ...request,
      headers: {
        ...(route.defaults as any)?.headers,
        authorization: `Bearer ${apiKey}`,
      },
    }

    const body = await Effect.runPromise(route.body.from(merged as any))
    const prepared = await Effect.runPromise(route.prepareTransport(body, merged as any))
    const collected = await Effect.runPromise(Stream.runCollect(route.streamPrepared(prepared, merged as any, RUNTIME)))

    let text = ""
    for (const event of collected) {
      if ((event as any).type === "text-delta") text += (event as any).text
    }

    return tryParseTitle(text)
  } catch (e) {
    console.warn("Title generation failed:", e)
    return null
  }
}

export async function generateSessionTitle(userMessage: string, responseContext?: string): Promise<string | null> {
  const sanitized = sanitizeForTitleInput(userMessage)
  if (!sanitized) return null
  return generateTitleNative(sanitized, responseContext)
}
