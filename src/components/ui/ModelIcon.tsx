import { getModelDefinition } from '@core/config/models';
import { getProviderLabel } from '@core/providers';

interface ModelIconProps {
  modelId: string;
  size?: number;
  className?: string;
}

const FIRST_PARTY_PROVIDERS = new Set(['google'])

const MODEL_PATTERN_ICONS: [RegExp, string][] = [
  [/gemma/i, '/gemma-color.svg'],
  [/gemini/i, '/gemini-color.svg'],
];

const PROVIDER_ICONS: Record<string, string> = {
  google: '/google-color.svg',
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
