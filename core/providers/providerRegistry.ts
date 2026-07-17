import { createCloudflare } from './createCloudflare';

function makeGoogleFetch(): typeof globalThis.fetch {
  const GOOGLE_TIMEOUT = 60_000;

  return async (input, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT);
    try {
      const response = await globalThis.fetch(input, { ...init, signal: controller.signal });
      if (!response.ok || !response.body) return response;
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('stream') && !ct.includes('event-stream')) return response;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let toolIdx = 0;

      const stream = new ReadableStream<Uint8Array>({
        async start(ctrl) {
          let buf = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split('\n');
              buf = lines.pop() || '';
              for (const line of lines) {
                if (!line.startsWith('data: ')) {
                  ctrl.enqueue(new TextEncoder().encode(line + '\n'));
                  continue;
                }
                const data = line.slice(6);
                if (data === '[DONE]') {
                  ctrl.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);
                  const tcs = parsed?.choices?.[0]?.delta?.tool_calls;
                  if (tcs && Array.isArray(tcs)) {
                    for (const tc of tcs) {
                      if (tc.index === undefined) tc.index = toolIdx++;
                    }
                  }
                  ctrl.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(parsed) + '\n\n'));
                } catch {
                  ctrl.enqueue(new TextEncoder().encode(line + '\n'));
                }
              }
            }
            if (buf) ctrl.enqueue(new TextEncoder().encode(buf + '\n'));
          } catch (e) {
            ctrl.error(e instanceof Error ? e : new Error(String(e)));
          } finally {
            ctrl.close();
          }
        },
      });

      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Google API request timed out');
      }
      throw e instanceof Error ? e : new Error(String(e));
    } finally {
      clearTimeout(timeout);
    }
  };
}

export interface KeyProvider {
  id: string;
  label: string;
  icon: string;
  configKey: string;
  envVar: string;
  baseURL: string;
  defaultModel: string;
  modelIdPrefixes: string[];
  createClient: (apiKey: string, baseURL?: string) => any;
}

type ProviderClient = any;

const registry = new Map<string, KeyProvider>();

export function registerProvider(provider: KeyProvider): void {
  registry.set(provider.id, provider);
}

export function getProvider(id: string): KeyProvider | undefined {
  return registry.get(id);
}

export function getAllProviders(): KeyProvider[] {
  return Array.from(registry.values());
}

export function getProviderClient(providerId: string, apiKey: string, baseURL?: string): ProviderClient | undefined {
  const provider = getProvider(providerId);
  if (!provider) return undefined;
  const target = baseURL ?? provider.baseURL;
  // When in browser, route through local proxy to avoid CORS
  // Skip for providers that construct URLs dynamically (e.g. Cloudflare with {accountId})
  const proxyPrefix = typeof window !== 'undefined' && !target.includes('{') ? '/proxy/' : '';
  return provider.createClient(apiKey, proxyPrefix + target);
}

export function getProviderLabel(id: string): string {
  return getProvider(id)?.label ?? id;
}


export function getProviderApiKeys(): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const p of getAllProviders()) {
    keys[p.id] = p.configKey;
  }
  return keys;
}

const PROVIDERS: KeyProvider[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    icon: '/claude-color.svg',
    configKey: 'anthropic-api-key',
    envVar: 'ANTHROPIC_API_KEY',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4',
    modelIdPrefixes: ['claude'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'openai',
    label: 'OpenAI',
    icon: '/openai.svg',
    configKey: 'openai-api-key',
    envVar: 'OPENAI_API_KEY',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    modelIdPrefixes: ['gpt', 'o3', 'o4'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'google',
    label: 'Google AI Studio',
    icon: '/google-color.svg',
    configKey: 'google-api-key',
    envVar: 'GOOGLE_API_KEY',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    modelIdPrefixes: ['gemini'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey, fetch: makeGoogleFetch() }),
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    icon: '/deepseek-color.svg',
    configKey: 'deepseek-api-key',
    envVar: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    modelIdPrefixes: ['deepseek'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    icon: '/mistral-color.svg',
    configKey: 'mistral-api-key',
    envVar: 'MISTRAL_API_KEY',
    baseURL: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    modelIdPrefixes: ['mistral', 'codestral', 'pixtral'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'cohere',
    label: 'Cohere',
    icon: '/commanda-color.svg',
    configKey: 'cohere-api-key',
    envVar: 'COHERE_API_KEY',
    baseURL: 'https://api.cohere.com/compatibility/v1',
    defaultModel: 'command-a-03-2026',
    modelIdPrefixes: ['command', 'c4ai'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'groq',
    label: 'Groq',
    icon: '/groq-color.svg',
    configKey: 'groq-api-key',
    envVar: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    modelIdPrefixes: ['llama', 'qwen', 'deepseek', 'gpt-oss', 'meta-llama', 'openai'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'together',
    label: 'Together AI',
    icon: '/together-color.svg',
    configKey: 'together-api-key',
    envVar: 'TOGETHER_API_KEY',
    baseURL: 'https://api.together.xyz/v1',
    defaultModel: 'together/auto',
    modelIdPrefixes: ['together'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    icon: '/openrouter.svg',
    configKey: 'openrouter-api-key',
    envVar: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
    modelIdPrefixes: ['openrouter'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    icon: '/nvidia-color.svg',
    configKey: 'nvidia-api-key',
    envVar: 'NVIDIA_API_KEY',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    modelIdPrefixes: ['nvidia', 'meta', 'mistralai', 'google'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    icon: '/cerebras-color.svg',
    configKey: 'cerebras-api-key',
    envVar: 'CEREBRAS_API_KEY',
    baseURL: 'https://api.cerebras.ai/v1',
    defaultModel: 'cerebras/gpt-oss-120b',
    modelIdPrefixes: ['gpt-oss', 'zai', 'gemma'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'sambanova',
    label: 'SambaNova',
    icon: '/sambanova-color.svg',
    configKey: 'sambanova-api-key',
    envVar: 'SAMBANOVA_API_KEY',
    baseURL: 'https://api.sambanova.ai/v1',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    modelIdPrefixes: ['Meta', 'DeepSeek', 'gpt-oss', 'gemma'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    icon: '/huggingface-color.svg',
    configKey: 'huggingface-api-key',
    envVar: 'HUGGINGFACE_API_KEY',
    baseURL: 'https://api-inference.huggingface.co/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    modelIdPrefixes: ['meta-llama', 'Qwen', 'google'],
    createClient: (apiKey: string, _baseURL?: string) => ({ apiKey }),
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare AI',
    icon: '/cloudflare-color.svg',
    configKey: 'cloudflare-api-key',
    envVar: 'CLOUDFLARE_API_KEY',
    baseURL: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1',
    defaultModel: '@cf/meta/llama-3.1-8b-instruct',
    modelIdPrefixes: ['@cf', '@hf'],
    createClient: (apiKey: string, baseURL?: string) => {
      let accountId = baseURL?.match(/accounts\/([^/]+)/)?.[1] || '';
      if (accountId === '{accountId}') {
        accountId = '';
      }
      return createCloudflare(apiKey, accountId);
    },
  },
];

for (const p of PROVIDERS) {
  registerProvider(p);
}
