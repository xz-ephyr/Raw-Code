import { PROVIDER_CONFIGS, type ModelRegistryEntry, type ProviderId, type ReasoningMechanism } from "./model-registry"

interface ReasoningRule {
  test: RegExp
  reasoning: "native" | "tagged" | "none"
  mechanism: ReasoningMechanism
}

const REASONING_RULES: ReasoningRule[] = [
  { test: /^gemini-(2\.5|3\.[15])/, reasoning: "native", mechanism: { type: "reasoning_content" } },
  { test: /^gemma/, reasoning: "tagged", mechanism: { type: "inline_tags", open: "<thought>", close: "</thought>" } },
]

export const MODEL_REGISTRY_FALLBACK: ModelRegistryEntry[] = [
  { id: "gemini-2.5-flash", provider: "google", label: "Gemini 2.5 Flash", supportsThinking: true, reasoning: "native", reasoningMechanism: { type: "reasoning_content" }, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "gemini-2.5-pro", provider: "google", label: "Gemini 2.5 Pro", supportsThinking: true, reasoning: "native", reasoningMechanism: { type: "reasoning_content" }, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
  { id: "gemini-2.5-flash-lite", provider: "google", label: "Gemini 2.5 Flash Lite", supportsThinking: false, reasoning: "none", reasoningMechanism: { type: "none" }, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKeyEnv: "GOOGLE_API_KEY" },
]

export function getDefaultEnabledModels(): { provider: ProviderId; modelId: string }[] {
  return [
    { provider: "google", modelId: "gemini-2.5-flash" },
    { provider: "google", modelId: "gemini-2.5-pro" },
    { provider: "google", modelId: "gemini-2.5-flash-lite" },
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

function buildHeaders(apiKey: string): Record<string, string> {
  return { "Content-Type": "application/json", "x-goog-api-key": apiKey }
}

function normalizeCatalogResponse(data: any): string[] {
  if (!data?.models) return []
  return data.models.map((m: any) => (m.name as string).replace("models/", ""))
}

async function fetchRawModelIds(providerId: ProviderId): Promise<string[]> {
  const cfg = PROVIDER_CONFIGS[providerId]
  if (!cfg?.catalogEndpoint) return []
  const apiKey = getApiKey(providerId)
  if (!apiKey) return []
  const res = await fetch(cfg.catalogEndpoint, { headers: buildHeaders(apiKey) })
  if (!res.ok) return []
  const raw = await res.json()
  return normalizeCatalogResponse(raw)
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
  const ids = ["google"] as ProviderId[]
  const results = await Promise.allSettled(ids.map(fetchRawModelIds))
  const entries: ModelRegistryEntry[] = []

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const pid = ids[i]
    if (r.status === "fulfilled" && r.value.length > 0) {
      entries.push(...buildEntries(pid, r.value))
    }
  }

  if (entries.length === 0) {
    entries.push(...MODEL_REGISTRY_FALLBACK)
  }

  return entries
}

export async function forceRefreshModelRegistry(): Promise<ModelRegistryEntry[]> {
  return loadModelRegistry()
}
