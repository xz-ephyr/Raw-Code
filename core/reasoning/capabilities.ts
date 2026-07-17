export type ReasoningMode = 'native' | 'tagged' | 'none'

export type ReasoningMechanism =
  | { type: 'reasoning_content' }
  | { type: 'thinking_delta' }
  | { type: 'inline_tags'; open: string; close: string }
  | { type: 'none' }

export interface ModelCapability {
  reasoning: ReasoningMode
  mechanism: ReasoningMechanism
  tags?: { open: string; close: string }
}

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  // ── OpenAI ──
  'gpt-4o': { reasoning: 'none', mechanism: { type: 'none' } },
  'gpt-4o-mini': { reasoning: 'none', mechanism: { type: 'none' } },
  'o3': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'o4-mini': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'o4': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },

  // ── Anthropic ──
  'claude-sonnet-4': { reasoning: 'native', mechanism: { type: 'thinking_delta' } },
  'claude-haiku-3': { reasoning: 'none', mechanism: { type: 'none' } },
  'claude-opus-4': { reasoning: 'none', mechanism: { type: 'none' } },

  // ── Google / Gemini ──
  'gemini-2.5-flash': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'gemini-2.5-pro': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'gemini-2.5-flash-lite': { reasoning: 'none', mechanism: { type: 'none' } },
  'gemini-3-flash': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'gemini-3.1-flash-lite-preview': { reasoning: 'none', mechanism: { type: 'none' } },

  // ── Google / Gemma (tagged) ──
  'gemma-4-31b-it': { reasoning: 'tagged', mechanism: { type: 'inline_tags', open: '<thought>', close: '</thought>' } },
  'gemma-4-26b-a4b-it': { reasoning: 'tagged', mechanism: { type: 'inline_tags', open: '<thought>', close: '</thought>' } },
  'gemma-4-31b': { reasoning: 'tagged', mechanism: { type: 'inline_tags', open: '<thought>', close: '</thought>' } },

  // ── DeepSeek ──
  'deepseek-chat': { reasoning: 'none', mechanism: { type: 'none' } },
  'deepseek-reasoner': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'deepseek-coder': { reasoning: 'none', mechanism: { type: 'none' } },
  'deepseek-r1': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },

  // ── Mistral ──
  'mistral-small-latest': { reasoning: 'none', mechanism: { type: 'none' } },
  'mistral-medium-3.5': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'mistral-large-latest': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'codestral-latest': { reasoning: 'none', mechanism: { type: 'none' } },
  'pixtral-12b': { reasoning: 'none', mechanism: { type: 'none' } },
  'mistralai/mistral-large-3-675b-instruct-2512': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },

  // ── Groq-hosted ──
  'meta-llama/llama-4-scout-17b-16e-instruct': { reasoning: 'none', mechanism: { type: 'none' } },
  'llama-3.3-70b-versatile': { reasoning: 'none', mechanism: { type: 'none' } },
  'qwen/qwen3-32b': { reasoning: 'none', mechanism: { type: 'none' } },
  'qwen/qwen3.6-27b': { reasoning: 'tagged', mechanism: { type: 'inline_tags', open: '<think>', close: '</think>' } },
  'openai/gpt-oss-120b': { reasoning: 'none', mechanism: { type: 'none' } },

  // ── Cerebras ──
  'cerebras/gpt-oss-120b': { reasoning: 'none', mechanism: { type: 'none' } },
  'zai-glm-4.7': { reasoning: 'none', mechanism: { type: 'none' } },

  // ── SambaNova ──
  'Meta-Llama-3.3-70B-Instruct': { reasoning: 'none', mechanism: { type: 'none' } },
  'DeepSeek-V3.1': { reasoning: 'none', mechanism: { type: 'none' } },
  'DeepSeek-V3.2': { reasoning: 'none', mechanism: { type: 'none' } },
  'sambanova/gpt-oss-120b': { reasoning: 'none', mechanism: { type: 'none' } },

  // ── Cohere ──
  'command-a-03-2026': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'command-a-plus': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'command-r-plus-08-2024': { reasoning: 'native', mechanism: { type: 'reasoning_content' } },
  'command-r-08-2024': { reasoning: 'none', mechanism: { type: 'none' } },
  'command-r7b-12-2024': { reasoning: 'none', mechanism: { type: 'none' } },
  'c4ai-aya-expanse-32b': { reasoning: 'none', mechanism: { type: 'none' } },

  // ── NVIDIA ──
  'nvidia/llama-3.3-nemotron-super-49b-v1': { reasoning: 'none', mechanism: { type: 'none' } },
  'nvidia/nemotron-3-nano-30b-a3b': { reasoning: 'none', mechanism: { type: 'none' } },
  'meta/llama-3.1-8b-instruct': { reasoning: 'none', mechanism: { type: 'none' } },

  // ── HuggingFace ──
  'meta-llama/Llama-3.2-11B-Vision-Instruct': { reasoning: 'none', mechanism: { type: 'none' } },
  'meta-llama/Meta-Llama-3.1-8B-Instruct': { reasoning: 'none', mechanism: { type: 'none' } },
  'Qwen/Qwen2.5-72B-Instruct': { reasoning: 'none', mechanism: { type: 'none' } },
  'google/gemma-2-9b-it': { reasoning: 'none', mechanism: { type: 'none' } },

  // ── Cloudflare ──
  '@cf/meta/llama-3.1-8b-instruct': { reasoning: 'none', mechanism: { type: 'none' } },
  '@cf/meta/llama-3.2-3b-instruct': { reasoning: 'none', mechanism: { type: 'none' } },
  '@cf/qwen/qwen1.5-7b-chat-awq': { reasoning: 'none', mechanism: { type: 'none' } },
  '@cf/microsoft/phi-2': { reasoning: 'none', mechanism: { type: 'none' } },
}

export function getModelCapability(modelId: string): ModelCapability {
  for (const [pattern, cap] of Object.entries(MODEL_CAPABILITIES)) {
    if (modelId.includes(pattern)) return cap
  }
  return { reasoning: 'none', mechanism: { type: 'none' } }
}
