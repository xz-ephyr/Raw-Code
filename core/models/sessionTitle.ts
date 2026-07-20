import { getModelDefinition } from "@core/config/models"
import { getAllProviders } from "@core/providers"
import { PROVIDER_CONFIGS } from "@doktor/llm-providers/model-registry"

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

function getStoredKey(providerId: string): string {
  const p = getAllProviders().find(x => x.id === providerId)
  if (!p) return ""
  const stored = typeof localStorage !== "undefined"
    ? (localStorage.getItem(`rc_config_${p.configKey}`) || localStorage.getItem(p.configKey) || "")
    : ""
  const env = typeof process !== "undefined" ? (process.env[p.envVar] || "") : ""
  return stored || env
}

interface TitleProvider {
  id: string
  model: string
  key: string
}

function collectTitleProviders(): TitleProvider[] {
  const providers: TitleProvider[] = []

  const googleKey = getStoredKey("google")
  if (googleKey) {
    providers.push({ id: "google", model: PROVIDER_CONFIGS.google.defaultModel, key: googleKey })
  }

  for (const p of getAllProviders()) {
    if (p.id === "google") continue
    const key = getStoredKey(p.id)
    if (key && p.defaultModel) {
      providers.push({ id: p.id, model: p.defaultModel, key })
    }
  }

  return providers
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string | null> {
  const url = `/proxy/https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.3 },
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.warn(`Gemini title API error ${res.status}: ${body.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    return tryParseTitle(text)
  } catch (e) {
    console.warn("Gemini title fetch failed:", e)
    return null
  }
}

async function callOpenAICompatible(
  providerId: string,
  baseURL: string,
  model: string,
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  const url = `/proxy/${baseURL.replace(/^https?:\/\//, "")}/chat/completions`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant that generates concise conversation titles. Return JSON with a single \"title\" field." },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.warn(`${providerId} title API error ${res.status}: ${body.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    if (!text) return null

    return tryParseTitle(text)
  } catch (e) {
    console.warn(`${providerId} title fetch failed:`, e)
    return null
  }
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

  const candidates = collectTitleProviders()
  if (candidates.length === 0) return null

  for (const candidate of candidates) {
    if (candidate.id === "google") {
      const title = await callGemini(candidate.model, candidate.key, prompt)
      if (title) return title
    } else {
      const def = getModelDefinition(candidate.model)
      if (!def) {
        const genericUrl = `https://api.${candidate.id}.com/v1`
        const title = await callOpenAICompatible(candidate.id, genericUrl, candidate.model, candidate.key, prompt)
        if (title) return title
      } else {
        const p = getAllProviders().find(x => x.id === candidate.id)
        const baseURL = p?.baseURL || `https://api.${candidate.id}.com/v1`
        const title = await callOpenAICompatible(candidate.id, baseURL, candidate.model, candidate.key, prompt)
        if (title) return title
      }
    }
  }

  return null
}

export async function generateSessionTitle(userMessage: string, responseContext?: string): Promise<string | null> {
  const sanitized = sanitizeForTitleInput(userMessage)
  if (!sanitized) return null

  return generateTitleNative(sanitized, responseContext)
}