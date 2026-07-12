export type ReasoningMode = 'native' | 'tagged' | 'none'

export interface ModelCapability {
  reasoning: ReasoningMode
  tags?: { open: string; close: string }
}

const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  'gemini-2.5-flash': { reasoning: 'native' },
  'gemini-3-flash': { reasoning: 'native' },
  'gemini-3.1-flash-lite-preview': { reasoning: 'none' },
  'gemma-4-31b-it': { reasoning: 'tagged', tags: { open: '<thought>', close: '</thought>' } },
  'gemma-4-26b-a4b-it': { reasoning: 'tagged', tags: { open: '<thought>', close: '</thought>' } },
  'qwen/qwen3.6-27b': { reasoning: 'tagged', tags: { open: '<think>', close: '</think>' } },
  'deepseek-r1': { reasoning: 'native' },
  'deepseek-reasoner': { reasoning: 'native' },
  'mistral-medium-3.5': { reasoning: 'native' },
  'mistral-large-latest': { reasoning: 'native' },
  'command-a-03-2026': { reasoning: 'native' },
  'command-a-plus': { reasoning: 'native' },
  'command-r-plus-08-2024': { reasoning: 'native' },
  'nvidia/llama-3.3-nemotron-super-49b-v1': { reasoning: 'none' },
  'nvidia/nemotron-3-nano-30b-a3b': { reasoning: 'none' },
  'meta/llama-3.1-8b-instruct': { reasoning: 'none' },
  'mistralai/mistral-large-3-675b-instruct-2512': { reasoning: 'native' },
}

export function getModelCapability(modelId: string): ModelCapability {
  for (const [pattern, cap] of Object.entries(MODEL_CAPABILITIES)) {
    if (modelId.includes(pattern)) return cap
  }
  return { reasoning: 'none' }
}
