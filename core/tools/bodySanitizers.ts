import type { LLMRequest } from "@doktor/llm-providers"

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

export function buildGeminiBody(body: Record<string, unknown>, _request: LLMRequest): Record<string, unknown> {
  stripStreamOptions(body)
  stripParallelToolCalls(body)
  stripUnsupportedGenParams(body)
  ensureSimpleToolChoice(body)
  sanitizeToolDefinitions(body)
  delete body.reasoning_effort
  delete body.user
  delete body.metadata
  if (body.max_tokens !== undefined) {
    body.maxOutputTokens = body.max_tokens
    delete body.max_tokens
  }
  return body
}

export const providerBuilders: Record<string, BodySanitizer> = {
  google: buildGeminiBody,
}

export function captureProviderFailure(provider: string, body: unknown, status: number, responseText: string): void {
  logFailure(provider, body, status, responseText)
}
