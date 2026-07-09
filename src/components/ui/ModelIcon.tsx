import { ModelProvider, ProviderIcon } from '@lobehub/icons';
import { cn } from '@/lib/utils';

const MODEL_BRAND: Record<string, string> = {
  'gemini-3.5-flash': 'gemini',
  'gemini-3-flash-preview': 'gemini',
  'gemini-2.5-flash': 'gemini',
  'gemini-2.5-flash-lite': 'gemini',
  'gemma-4-31b-it': 'gemma',
  'gemma-4-26b-a4b-it': 'gemma',
  'groq/compound': 'groq',
  'groq/compound-mini': 'groq',
  'qwen/qwen3-32b': 'qwen',
  'llama-3.1-8b-instant': 'meta',
  'openai/gpt-oss-safeguard-20b': 'openai',
  'deepseek-v4-flash-free': 'deepseek',
  'big-pickle': 'bigpickle',
  'mimo-v2.5-free': 'mimo',
  'mistral-large-latest': 'mistral',
  'mistral-medium-latest': 'mistral',
  'mistral-small-latest': 'mistral',
  'magistral-medium-latest': 'magistral',
  'devstral-latest': 'devstral',
  'codestral-latest': 'codestral',
  'tencent/hy3:free': 'tencent',
  'nvidia/nemotron-3-ultra-550b-a55b:free': 'nvidia',
  'poolside/laguna-m.1:free': 'poolside',
  'nvidia/nemotron-3-super-120b-a12b:free': 'nvidia',
  'nvidia/nemotron-3-nano-30b-a3b:free': 'nvidia',
  'openai/gpt-oss-20b:free': 'openai',
  'nvidia/nemotron-nano-12b-v2-vl:free': 'nvidia',
  'poolside/laguna-xs.2:free': 'poolside',
  'nvidia/nemotron-nano-9b-v2:free': 'nvidia',
  'openrouter/free': 'openrouter',
  'cohere/north-mini-code:free': 'cohere',
  'nvidia/nemotron-3.5-content-safety:free': 'nvidia',
  'gpt-oss-120b': 'cerebras',
  'zai-glm-4.7': 'zhipu',
  'gemma-4-31b': 'gemma',
};

const BRAND_PROVIDER: Record<string, ModelProvider> = {
  gemini: ModelProvider.Gemini,
  groq: ModelProvider.Groq,
  mistral: ModelProvider.Mistral,
  qwen: ModelProvider.Qwen,
  tencent: ModelProvider.Tencent,
  cohere: ModelProvider.Cohere,
  openrouter: ModelProvider.OpenRouter,
  cerebras: ModelProvider.Cerebras,
  zhipu: ModelProvider.ZhiPu,
  opencodezen: ModelProvider.OpenCodeZen,
  openai: ModelProvider.OpenAI,
  meta: ModelProvider.Meta,
  nvidia: ModelProvider.Nvidia,
  deepseek: ModelProvider.DeepSeek,
};

const CUSTOM_SVG: Record<string, React.ReactNode> = {
  gemma: (
    <g fill="none" stroke="currentColor" strokeLinejoin="round">
      <path d="M12 1.5L22.5 12 12 22.5 1.5 12 12 1.5z" strokeWidth="1.5" />
      <path d="M12 4.5L19.5 12 12 19.5 4.5 12 12 4.5z" strokeWidth="1" />
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" stroke="none" />
    </g>
  ),
  poolside: (
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M4 8q2-3 4 0t4 0 4 0 4 0" strokeWidth="1.5" />
      <path d="M4 14q2-3 4 0t4 0 4 0 4 0" strokeWidth="1.5" />
    </g>
  ),
  bigpickle: (
    <g fill="none" stroke="currentColor">
      <ellipse cx="12" cy="12" rx="5" ry="8" strokeWidth="1.5" />
      <path d="M12 4v2M12 18v2" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  mimo: (
    <g fill="none" stroke="currentColor">
      <circle cx="10" cy="16" r="3" strokeWidth="1.5" />
      <path d="M13 16V5l6 2v9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="14" r="3" strokeWidth="1.5" />
    </g>
  ),
  magistral: (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l5 8 5-8h3" strokeWidth="2" />
      <path d="M6 12h12" strokeWidth="1.2" opacity="0.5" />
    </g>
  ),
  devstral: (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" strokeWidth="2" />
    </g>
  ),
  codestral: (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" strokeWidth="1.8" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </g>
  ),
};

interface ModelIconProps {
  modelId: string;
  size?: number;
  className?: string;
}

export function ModelIcon({ modelId, size = 14, className }: ModelIconProps) {
  const brand = MODEL_BRAND[modelId];

  if (!brand) return null;

  const provider = BRAND_PROVIDER[brand];
  if (provider) {
    return (
      <ProviderIcon
        provider={provider}
        size={size}
        className={cn('shrink-0', className)}
      />
    );
  }

  const paths = CUSTOM_SVG[brand];
  if (!paths) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}
