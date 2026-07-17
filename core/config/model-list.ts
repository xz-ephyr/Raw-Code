export interface ModelListEntry {
  id: string
  name: string
  chef: string
  chefSlug: string
  providers: string[]
  supportsThinking?: boolean
}

export const MODEL_LIST: ModelListEntry[] = [
  // Google AI Studio
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", chef: "Google AI Studio", chefSlug: "google", providers: ["google"], supportsThinking: true },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", chef: "Google AI Studio", chefSlug: "google", providers: ["google"], supportsThinking: true },
  { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite", chef: "Google AI Studio", chefSlug: "google", providers: ["google"], supportsThinking: false },
  { id: "gemma-4-31b-it", name: "Gemma 4 31B", chef: "Google AI Studio", chefSlug: "google", providers: ["google"], supportsThinking: true },
  { id: "gemma-4-26b-a4b-it", name: "Gemma 4 26B", chef: "Google AI Studio", chefSlug: "google", providers: ["google"], supportsThinking: true },

  // Groq
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", chef: "Groq", chefSlug: "groq", providers: ["groq"], supportsThinking: false },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", chef: "Groq", chefSlug: "groq", providers: ["groq"], supportsThinking: false },
  { id: "qwen/qwen3-32b", name: "Qwen3 32B", chef: "Groq", chefSlug: "groq", providers: ["groq"], supportsThinking: false },
  { id: "qwen/qwen3.6-27b", name: "Qwen3.6 27B", chef: "Groq", chefSlug: "groq", providers: ["groq"], supportsThinking: true },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", chef: "Groq", chefSlug: "groq", providers: ["groq"], supportsThinking: false },

  // Cerebras
  { id: "cerebras/gpt-oss-120b", name: "GPT-OSS 120B", chef: "Cerebras", chefSlug: "cerebras", providers: ["cerebras"], supportsThinking: false },
  { id: "zai-glm-4.7", name: "Z.ai GLM 4.7", chef: "Cerebras", chefSlug: "cerebras", providers: ["cerebras"], supportsThinking: false },
  { id: "gemma-4-31b", name: "Gemma 4 31B", chef: "Cerebras", chefSlug: "cerebras", providers: ["cerebras"], supportsThinking: false },

  // Mistral AI
  { id: "mistral-small-latest", name: "Mistral Small 4", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"], supportsThinking: false },
  { id: "mistral-medium-3.5", name: "Mistral Medium 3.5", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"], supportsThinking: true },
  { id: "mistral-large-latest", name: "Mistral Large 3", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"], supportsThinking: true },
  { id: "codestral-latest", name: "Codestral", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"], supportsThinking: false },
  { id: "pixtral-12b", name: "Pixtral 12B", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"], supportsThinking: false },

  // SambaNova
  { id: "Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B", chef: "SambaNova", chefSlug: "sambanova", providers: ["sambanova"], supportsThinking: false },
  { id: "DeepSeek-V3.1", name: "DeepSeek V3.1", chef: "SambaNova", chefSlug: "sambanova", providers: ["sambanova"], supportsThinking: false },
  { id: "sambanova/gpt-oss-120b", name: "GPT-OSS 120B", chef: "SambaNova", chefSlug: "sambanova", providers: ["sambanova"], supportsThinking: false },
  { id: "DeepSeek-V3.2", name: "DeepSeek V3.2", chef: "SambaNova", chefSlug: "sambanova", providers: ["sambanova"], supportsThinking: false },
  { id: "gemma-4-31B-it", name: "Gemma 4 31B", chef: "SambaNova", chefSlug: "sambanova", providers: ["sambanova"], supportsThinking: true },

  // Cohere
  { id: "command-a-03-2026", name: "Command A", chef: "Cohere", chefSlug: "cohere", providers: ["cohere"], supportsThinking: true },
  { id: "command-a-plus", name: "Command A+", chef: "Cohere", chefSlug: "cohere", providers: ["cohere"], supportsThinking: true },
  { id: "command-r-plus-08-2024", name: "Command R+", chef: "Cohere", chefSlug: "cohere", providers: ["cohere"], supportsThinking: true },
  { id: "command-r-08-2024", name: "Command R", chef: "Cohere", chefSlug: "cohere", providers: ["cohere"], supportsThinking: false },
  { id: "command-r7b-12-2024", name: "Command R7B", chef: "Cohere", chefSlug: "cohere", providers: ["cohere"], supportsThinking: false },
  { id: "c4ai-aya-expanse-32b", name: "Aya Expanse 32B", chef: "Cohere", chefSlug: "cohere", providers: ["cohere"], supportsThinking: false },

  // Hugging Face
  { id: "meta-llama/Llama-3.2-11B-Vision-Instruct", name: "Llama 3.2 11B Vision", chef: "Hugging Face", chefSlug: "huggingface", providers: ["huggingface"], supportsThinking: false },
  { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B", chef: "Hugging Face", chefSlug: "huggingface", providers: ["huggingface"], supportsThinking: false },
  { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen2.5 72B", chef: "Hugging Face", chefSlug: "huggingface", providers: ["huggingface"], supportsThinking: false },
  { id: "google/gemma-2-9b-it", name: "Gemma 2 9B", chef: "Hugging Face", chefSlug: "huggingface", providers: ["huggingface"], supportsThinking: false },

  // Cloudflare Workers AI
  { id: "@cf/meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B", chef: "Cloudflare AI", chefSlug: "cloudflare", providers: ["cloudflare"], supportsThinking: false },
  { id: "@cf/meta/llama-3.2-3b-instruct", name: "Llama 3.2 3B", chef: "Cloudflare AI", chefSlug: "cloudflare", providers: ["cloudflare"], supportsThinking: false },
  { id: "@cf/qwen/qwen1.5-7b-chat-awq", name: "Qwen1.5 7B", chef: "Cloudflare AI", chefSlug: "cloudflare", providers: ["cloudflare"], supportsThinking: false },
  { id: "@cf/microsoft/phi-2", name: "Phi-2", chef: "Cloudflare AI", chefSlug: "cloudflare", providers: ["cloudflare"], supportsThinking: false },

  // NVIDIA NIM
  { id: "nvidia/llama-3.3-nemotron-super-49b-v1", name: "Nemotron Super 49B", chef: "NVIDIA NIM", chefSlug: "nvidia", providers: ["nvidia"], supportsThinking: false },
  { id: "nvidia/nemotron-3-nano-30b-a3b", name: "Nemotron 3 Nano 30B", chef: "NVIDIA NIM", chefSlug: "nvidia", providers: ["nvidia"], supportsThinking: false },
  { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B", chef: "NVIDIA NIM", chefSlug: "nvidia", providers: ["nvidia"], supportsThinking: false },
  { id: "mistralai/mistral-large-3-675b-instruct-2512", name: "Mistral Large 3", chef: "NVIDIA NIM", chefSlug: "nvidia", providers: ["nvidia"], supportsThinking: true },

  // DeepSeek
  { id: "deepseek-chat", name: "DeepSeek V4-Flash", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"], supportsThinking: false },
  { id: "deepseek-reasoner", name: "DeepSeek R1", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"], supportsThinking: true },
  { id: "deepseek-coder", name: "DeepSeek Coder", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"], supportsThinking: false },
]

export function getStoredSelectedModel(): string {
  try {
    return localStorage.getItem("selected-model") || "auto"
  } catch {
    return "auto"
  }
}

export function getEntryById(id: string): ModelListEntry | undefined {
  return MODEL_LIST.find(e => e.id === id)
}

export function getSelectedEntry(): ModelListEntry | undefined {
  const id = getStoredSelectedModel()
  return getEntryById(id) || MODEL_LIST[0]
}

function getModelProviderOrder(): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const m of MODEL_LIST) {
    if (!seen.has(m.chef)) {
      seen.add(m.chef)
      order.push(m.chef)
    }
  }
  return order
}

export function getChefIndex(chef: string): number {
  const order = getModelProviderOrder()
  return order.indexOf(chef)
}
