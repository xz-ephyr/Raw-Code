import { PROVIDER_CONFIGS, getAllProviderIds, type ModelRegistryEntry, type ProviderId, type ReasoningMechanism } from "./model-registry"

interface ReasoningRule {
  test: RegExp
  reasoning: "native" | "tagged" | "none"
  mechanism: ReasoningMechanism
}

const REASONING_RULES: ReasoningRule[] = [
  { test: /^(o5)/, reasoning: "native", mechanism: { type: "reasoning_content" } },
  { test: /^claude-(sonnet|opus|fable)-[45]/, reasoning: "native", mechanism: { type: "thinking_delta" } },
  { test: /^gemini-(2\.5|3\.[15])/, reasoning: "native", mechanism: { type: "reasoning_content" } },
  { test: /^gemma/, reasoning: "tagged", mechanism: { type: "inline_tags", open: "<thought>", close: "</thought>" } },
  { test: /deepseek-(v[34]|reasoner|r1)/, reasoning: "native", mechanism: { type: "reasoning_content" } },
  { test: /mistral-(large|medium)/, reasoning: "native", mechanism: { type: "reasoning_content" } },
  { test: /qwen.*3\.6/, reasoning: "tagged", mechanism: { type: "inline_tags", open: "<think>", close: "</think>" } },
  { test: /mistralai\/mistral-large/, reasoning: "native", mechanism: { type: "reasoning_content" } },
  { test: /^grok-[45]/, reasoning: "native", mechanism: { type: "reasoning_content" } },
]

export const MODEL_REGISTRY_FALLBACK: ModelRegistryEntry[] = [
  { id: "gemini-2.5-flash", provider: "google", label: "Gemini 2.5 Flash", supportsThinking: true, reasoning: "native", reasoningMechanism: { type: "reasoning_content" }, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "gemini-2.5-pro", provider: "google", label: "Gemini 2.5 Pro", supportsThinking: true, reasoning: "native", reasoningMechanism: { type: "reasoning_content" }, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "gemini-2.5-flash-lite", provider: "google", label: "Gemini 2.5 Flash Lite", supportsThinking: false, reasoning: "none", reasoningMechanism: { type: "none" }, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
]

export function getDefaultEnabledModels(): { provider: ProviderId; modelId: string }[] {
  return [
    { provider: "openai", modelId: "gpt-5" },
    { provider: "anthropic", modelId: "claude-sonnet-4.5" },
    { provider: "google", modelId: "gemini-2.5-flash" },
    { provider: "deepseek", modelId: "deepseek-v3" },
    { provider: "grok", modelId: "grok-4" },
    { provider: "mistral", modelId: "mistral-small-latest" },
    { provider: "cerebras", modelId: "cerebras/gpt-oss-120b" },
    { provider: "nvidia", modelId: "nvidia/llama-3.3-nemotron-super-49b-v1" },
    { provider: "openrouter", modelId: "openrouter/auto" },
    { provider: "groq", modelId: "llama-3.3-70b-versatile" },
  ]
}

function detectReasoning(modelId: string): { reasoning: "native" | "tagged" | "none"; mechanism: ReasoningMechanism } {
  for (const rule of REASONING_RULES) {
    if (rule.test.test(modelId)) return { reasoning: rule.reasoning, mechanism: rule.mechanism }
  }
  return { reasoning: "none", mechanism: { type: "none" } }
}

function getApiKey(providerId: ProviderId): string | null {
  if (typeof localStorage === "undefined") return null
  const cfg = PROVIDER_CONFIGS[providerId]
  if (!cfg) return null
  return (
    localStorage.getItem(`rc_config_${cfg.configKey}`) ||
    localStorage.getItem(cfg.configKey) ||
    localStorage.getItem(cfg.envVar.toLowerCase()) ||
    null
  )
}

function buildCatalogHeaders(providerId: ProviderId, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (providerId === "anthropic") {
    headers["x-api-key"] = apiKey
    headers["anthropic-version"] = "2023-06-01"
  } else if (providerId === "google") {
    headers["x-goog-api-key"] = apiKey
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`
  }
  return headers
}

function normalizeCatalogResponse(providerId: ProviderId, data: any): string[] {
  if (providerId === "google") {
    if (!data?.models) return []
    return data.models.map((m: any) => (m.name as string).replace("models/", ""))
  }
  if (!data?.data) return []
  return data.data.map((m: any) => m.id as string)
}

async function fetchRawModelIds(providerId: ProviderId): Promise<string[]> {
  const cfg = PROVIDER_CONFIGS[providerId]
  if (!cfg?.catalogEndpoint) return []
  const apiKey = getApiKey(providerId)
  if (!apiKey) return []
  const res = await fetch(cfg.catalogEndpoint, { headers: buildCatalogHeaders(providerId, apiKey) })
  if (!res.ok) return []
  const raw = await res.json()
  return normalizeCatalogResponse(providerId, raw)
}

function buildEntries(providerId: ProviderId, modelIds: string[]): ModelRegistryEntry[] {
  const cfg = PROVIDER_CONFIGS[providerId]
  if (!cfg) return []
  return modelIds.map((id) => {
    const reason = detectReasoning(id)
    return {
      id,
      provider: providerId,
      label: id,
      supportsThinking: reason.reasoning !== "none",
      reasoning: reason.reasoning,
      reasoningMechanism: reason.mechanism,
      baseURL: cfg.baseURL,
      apiKeyEnv: cfg.envVar,
    }
  })
}

export async function loadModelRegistry(): Promise<ModelRegistryEntry[]> {
  const results = await Promise.allSettled(getAllProviderIds().map(fetchRawModelIds))
  const entries: ModelRegistryEntry[] = []
  const providersWithLive = new Set<ProviderId>()

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const pid = getAllProviderIds()[i]
    if (r.status === "fulfilled") {
      if (r.value.length > 0) {
        providersWithLive.add(pid)
        entries.push(...buildEntries(pid, r.value))
      }
    }
  }

  // For providers that returned no live models, add fallback entry
  for (const fb of MODEL_REGISTRY_FALLBACK) {
    if (!providersWithLive.has(fb.provider as ProviderId)) {
      if (!entries.some(e => e.id === fb.id)) {
        entries.push(fb)
      }
    }
  }

  return entries
}

export async function forceRefreshModelRegistry(): Promise<ModelRegistryEntry[]> {
  return loadModelRegistry()
}
