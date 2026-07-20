import { PROVIDER_CONFIGS, getAllProviderIds } from '@doktor/llm-providers/model-registry'
import type { ProviderId } from '@doktor/llm-providers/model-registry'

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
          let readTimedOut = false;
          const readTimeout = setTimeout(() => { readTimedOut = true; reader.cancel(); }, 60_000);
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { clearTimeout(readTimeout); break; }
              if (readTimedOut) { clearTimeout(readTimeout); break; }
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

function makeClient(id: ProviderId): (apiKey: string, baseURL?: string) => any {
  if (id === 'google') {
    return (apiKey: string, _baseURL?: string) => ({ apiKey, fetch: makeGoogleFetch() })
  }
  return (apiKey: string, _baseURL?: string) => ({ apiKey })
}

const PROVIDERS: KeyProvider[] = getAllProviderIds().map(id => {
  const cfg = PROVIDER_CONFIGS[id]
  return {
    id: cfg.id,
    label: cfg.label,
    icon: cfg.icon,
    configKey: cfg.configKey,
    envVar: cfg.envVar,
    baseURL: cfg.baseURL,
    defaultModel: cfg.defaultModel,
    modelIdPrefixes: cfg.modelIdPrefixes,
    createClient: makeClient(id),
  }
})

for (const p of PROVIDERS) {
  registerProvider(p);
}
