export type ProviderId = 'google'

export type ReasoningMode = 'native' | 'tagged' | 'none'

export type ReasoningMechanism =
  | { type: 'reasoning_content' }
  | { type: 'thinking_delta' }
  | { type: 'inline_tags'; open: string; close: string }
  | { type: 'none' }

export interface ModelRegistryEntry {
  id: string
  provider: ProviderId
  label: string
  supportsThinking: boolean
  reasoning: ReasoningMode
  reasoningMechanism: ReasoningMechanism
  baseURL: string
  apiKeyEnv: string
  limits?: { context?: number; output?: number }
}

export interface ProviderConfig {
  id: ProviderId
  label: string
  icon: string
  configKey: string
  envVar: string
  baseURL: string
  defaultModel: string
  modelIdPrefixes: string[]
  catalogEndpoint: string
  isAnthropic?: boolean
}

export const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
  google: { id: 'google', label: 'Google AI Studio', icon: '/google-color.svg', configKey: 'google-api-key', envVar: 'GOOGLE_API_KEY', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-2.5-flash', modelIdPrefixes: ['gemini'], catalogEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
}

export function getProviderConfig(id: ProviderId): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[id]
}

export function getDefaultModel(provider: ProviderId): string | undefined {
  return PROVIDER_CONFIGS[provider]?.defaultModel
}

export function getAllProviderIds(): ProviderId[] {
  return Object.keys(PROVIDER_CONFIGS) as ProviderId[]
}
