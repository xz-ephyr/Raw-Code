import type { LLMRequest } from "@doktor/llm-providers"
import { getAllProviderIds } from "@doktor/llm-providers/model-registry"

export type BodySanitizer<Body = Record<string, unknown>> = (
  body: Body,
  request: LLMRequest,
) => Body

function safeJson(obj: unknown): string {
  try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
}

function stripStreamOptions(body: Record<string, unknown>): void {
  if (body.stream_options !== undefined) {
    delete body.stream_options
  }
}

function stripParallelToolCalls(body: Record<string, unknown>): void {
  if (body.parallel_tool_calls !== undefined) {
    delete body.parallel_tool_calls
  }
}

function stripUnsupportedGenParams(body: Record<string, unknown>): void {
  for (const key of ["presence_penalty", "frequency_penalty", "seed", "logit_bias"]) {
    if (body[key] !== undefined) delete body[key]
  }
}

function ensureSimpleToolChoice(body: Record<string, unknown>): void {
  if (!body.tool_choice || typeof body.tool_choice !== "object") return
  const tc = body.tool_choice as Record<string, unknown>
  if (tc.type === "function" && tc.function) {
    body.tool_choice = "auto"
  }
}

function ensureRoleAlternation(body: Record<string, unknown>): void {
  const messages = body.messages as Array<Record<string, unknown>> | undefined
  if (!messages || messages.length < 2) return
  const merged: Array<Record<string, unknown>> = [messages[0]]
  for (let i = 1; i < messages.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = messages[i]
    if (prev.role === curr.role && curr.role !== "system") {
      if (curr.role === "tool") {
        merged.push(curr)
      } else if (prev.tool_calls || curr.tool_calls) {
        prev.tool_calls = [...(prev.tool_calls as any[] || []), ...(curr.tool_calls as any[] || [])]
        const prevContent = typeof prev.content === "string" ? prev.content : ""
        const currContent = typeof curr.content === "string" ? curr.content : ""
        const merged = prevContent + currContent
        prev.content = merged || undefined
        if (prev.content === undefined) delete prev.content
      } else {
        const prevContent = typeof prev.content === "string" ? prev.content : safeJson(prev.content)
        const currContent = typeof curr.content === "string" ? curr.content : safeJson(curr.content)
        prev.content = prevContent + "\n" + currContent
      }
    } else {
      merged.push(curr)
    }
  }
  body.messages = merged
}

function validateNoConsecutiveSameRole(body: Record<string, unknown>, provider: string): string | null {
  const messages = body.messages as Array<Record<string, unknown>> | undefined
  if (!messages) return null
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role && messages[i].role !== "system") {
      return `${provider}: messages[${i - 1}] and messages[${i}] both have role="${messages[i].role}" — consecutive same-role messages are not supported`
    }
  }
  return null
}

function logFailure(provider: string, requestBody: unknown, status: number, responseBody: string): void {
  const entry = {
    ts: Date.now(),
    provider,
    status,
    body: safeJson(requestBody).slice(0, 2000),
    response: responseBody.slice(0, 2000),
  }
  console.error(`[provider:${provider}] HTTP ${status}`, entry)
  try {
    const key = `rc_provider_errors`
    const existing = JSON.parse(localStorage.getItem(key) || "[]")
    existing.push(entry)
    if (existing.length > 50) existing.splice(0, existing.length - 50)
    localStorage.setItem(key, JSON.stringify(existing))
  } catch {}
}

function sanitizeToolDefinitions(body: Record<string, unknown>): void {
  const tools = body.tools as Array<Record<string, unknown>> | undefined
  if (!tools) return
  for (const tool of tools) {
    if (tool.function && typeof tool.function === "object") {
      const fn = tool.function as Record<string, unknown>
      delete fn.parallel_tool_calls
    }
  }
}

export function buildOpenAIBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  return body
}

export function buildMistralBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  stripUnsupportedGenParams(body)
  ensureRoleAlternation(body)
  sanitizeToolDefinitions(body)
  if (body.tool_choice && typeof body.tool_choice === "object") {
    const tc = body.tool_choice as Record<string, unknown>
    if (tc.type === "function") body.tool_choice = "auto"
  }
  const err = validateNoConsecutiveSameRole(body, "Mistral")
  if (err) console.warn(`[pre-send] ${err} — merged consecutive roles`)
  return body
}

export function buildGeminiBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  stripUnsupportedGenParams(body)
  ensureRoleAlternation(body)
  ensureSimpleToolChoice(body)
  sanitizeToolDefinitions(body)
  delete body.reasoning_effort
  delete body.user
  delete body.metadata
  if (body.max_tokens !== undefined) {
    body.maxOutputTokens = body.max_tokens
    delete body.max_tokens
  }
  const err = validateNoConsecutiveSameRole(body, "Gemini")
  if (err) console.warn(`[pre-send] ${err} — merged consecutive roles`)
  return body
}

export function buildDeepSeekBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  stripStreamOptions(body)
  ensureRoleAlternation(body)
  return body
}

export function buildGroqBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  ensureRoleAlternation(body)
  return body
}

export function buildOpenRouterBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  stripStreamOptions(body)
  ensureRoleAlternation(body)
  return body
}

export function buildNvidiaBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  stripUnsupportedGenParams(body)
  ensureRoleAlternation(body)
  ensureSimpleToolChoice(body)
  sanitizeToolDefinitions(body)
  return body
}

export function buildCerebrasBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  ensureRoleAlternation(body)
  return body
}

const BUILTIN_SANITIZERS: Record<string, BodySanitizer> = {
  openai: buildOpenAIBody,
  anthropic: buildOpenAIBody,
  google: buildGeminiBody,
  deepseek: buildDeepSeekBody,
  mistral: buildMistralBody,
  groq: buildGroqBody,
  openrouter: buildOpenRouterBody,
  nvidia: buildNvidiaBody,
  cerebras: buildCerebrasBody,
}

export const providerBuilders: Record<string, BodySanitizer> = {}

for (const providerId of getAllProviderIds()) {
  providerBuilders[providerId] = BUILTIN_SANITIZERS[providerId] ?? buildOpenAIBody
}

export function validateBody(body: Record<string, unknown>, provider: string): string | null {
  const msg = body.messages
  if (!Array.isArray(msg) || msg.length === 0) {
    return `${provider}: messages must be a non-empty array`
  }
  for (const m of msg) {
    if (!m || typeof m !== "object") return `${provider}: each message must be an object`
    if (!m.role || typeof m.role !== "string") return `${provider}: each message must have a string role`
  }
  if (provider === "mistral") {
    const err = validateNoConsecutiveSameRole(body, provider)
    if (err) return err
  }
  return null
}

export function captureProviderFailure(provider: string, body: unknown, status: number, responseText: string): void {
  logFailure(provider, body, status, responseText)
}
