import { MODEL_REGISTRY_FALLBACK } from '@doktor/llm-providers/model-catalog'
import type { ReasoningMode, ReasoningMechanism } from '@doktor/llm-providers/model-registry'

export type { ReasoningMode, ReasoningMechanism }

export interface ModelCapability {
  reasoning: ReasoningMode
  mechanism: ReasoningMechanism
  tags?: { open: string; close: string }
}

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {}

for (const m of MODEL_REGISTRY_FALLBACK) {
  const capability: ModelCapability = {
    reasoning: m.reasoning,
    mechanism: m.reasoningMechanism,
  }
  if (m.reasoningMechanism.type === 'inline_tags') {
    capability.tags = { open: m.reasoningMechanism.open, close: m.reasoningMechanism.close }
  }
  MODEL_CAPABILITIES[m.id] = capability
}

export function getModelCapability(modelId: string): ModelCapability {
  for (const [pattern, cap] of Object.entries(MODEL_CAPABILITIES)) {
    if (modelId.includes(pattern)) return cap
  }
  return { reasoning: 'none', mechanism: { type: 'none' } }
}
