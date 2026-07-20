import { getModelDefinition } from '@core/config/models';
import { getProviderLabel } from '@core/providers';

interface ModelIconProps {
  modelId: string;
  size?: number;
  className?: string;
}

const FIRST_PARTY_PROVIDERS = new Set(['openai', 'anthropic', 'google', 'grok'])

const MODEL_PATTERN_ICONS: [RegExp, string][] = [
  [/zai/i, '/zai.svg'],
  [/gemma/i, '/gemma-color.svg'],
  [/deepseek/i, '/deepseek-color.svg'],
  [/openai|^gpt/i, '/openai.svg'],
  [/llama|^meta/i, '/meta-color.svg'],
  [/gemini/i, '/gemini-color.svg'],
  [/nemotron/i, '/nvidia-color.svg'],
  [/mistral|codestral|pixtral/i, '/mistral-color.svg'],
  [/qwen/i, '/qwen-color.svg'],
  [/phi/i, '/microsoft-color.svg'],
  [/command|^c4ai/i, '/commanda-color.svg'],
  [/together/i, '/together-color.svg'],
  [/claude|anthropic/i, '/claude-color.svg'],
  [/openrouter/i, '/openrouter.svg'],
  [/^grok/i, '/grok-color.svg'],
];

const PROVIDER_ICONS: Record<string, string> = {
  anthropic: '/claude-color.svg',
  openai: '/openai.svg',
  google: '/google-color.svg',
  deepseek: '/deepseek-color.svg',
  mistral: '/mistral-color.svg',
  cohere: '/commanda-color.svg',
  groq: '/assets/images/providers/groq.svg',
  together: '/together-color.svg',
  openrouter: '/openrouter.svg',
  nvidia: '/nvidia-color.svg',
  cerebras: '/assets/images/providers/cerebras.svg',
  sambanova: '/assets/images/providers/cerebras.svg',
  huggingface: '/assets/images/providers/mistral.svg',
  cloudflare: '/assets/images/providers/cerebras.svg',
  grok: '/grok-color.svg',
};

export function ModelIcon({ modelId, size = 14, className = '' }: ModelIconProps) {
  const def = getModelDefinition(modelId);
  const provider = def?.provider;

  let iconSrc: string;

  if (provider && FIRST_PARTY_PROVIDERS.has(provider)) {
    const modelPattern = MODEL_PATTERN_ICONS.find(([re]) => re.test(modelId));
    iconSrc = modelPattern?.[1] || PROVIDER_ICONS[provider] || '/assets/images/providers/opencodezen.svg';
  } else if (provider) {
    iconSrc = PROVIDER_ICONS[provider] || '/assets/images/providers/opencodezen.svg';
  } else {
    const modelPattern = MODEL_PATTERN_ICONS.find(([re]) => re.test(modelId));
    iconSrc = modelPattern?.[1] || '/assets/images/providers/opencodezen.svg';
  }

  const label = provider ? getProviderLabel(provider) : '';

  return (
    <img
      src={iconSrc}
      alt={label}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
