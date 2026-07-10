import { getModelDefinition } from '@core/config/models';
import { getProviderLabel } from '@core/providers';

interface ModelIconProps {
  modelId: string;
  size?: number;
  className?: string;
}

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
];

const PROVIDER_ICONS: Record<string, string> = {
  cerebras: '/assets/images/providers/cerebras.svg',
  groq: '/assets/images/providers/groq.svg',
  sambanova: '/assets/images/providers/cerebras.svg',
  huggingface: '/assets/images/providers/mistral.svg',
  cloudflare: '/assets/images/providers/cerebras.svg',
  nvidia: '/assets/images/providers/cerebras.svg',
};

export function ModelIcon({ modelId, size = 14, className = '' }: ModelIconProps) {
  const def = getModelDefinition(modelId);

  const modelPattern = MODEL_PATTERN_ICONS.find(([re]) => re.test(modelId));
  const iconSrc = modelPattern?.[1] || (def?.provider ? PROVIDER_ICONS[def.provider] : null) || '/assets/images/providers/opencodezen.svg';
  const label = def ? getProviderLabel(def.provider) : '';

  return (
    <img
      src={iconSrc}
      alt={label}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
