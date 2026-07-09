import { ModelProvider, ProviderIcon } from '@lobehub/icons';
import { cn } from '@/lib/utils';

function getModelBrand(modelId: string): string | null {
  if (modelId.startsWith('deepseek/')) return 'deepseek';
  if (modelId.startsWith('z-ai/')) return 'z-ai';
  if (modelId.startsWith('openai/')) return 'openai';
  if (modelId.startsWith('anthropic/')) return 'anthropic';
  if (modelId.startsWith('google/')) return 'google';
  if (modelId.startsWith('qwen/')) return 'qwen';
  return null;
}

const BRAND_PROVIDER: Record<string, ModelProvider> = {
  deepseek: ModelProvider.DeepSeek,
};

const CUSTOM_SVG: Record<string, React.ReactNode> = {
  'z-ai': (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="6" />
      <path d="M12 6v12M6 12h12" strokeLinecap="round" />
    </g>
  ),
  openai: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5L12 2z" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
    </g>
  ),
  anthropic: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 18l5-14 5 14M9 14h6" />
    </g>
  ),
  google: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5V2M12 22v-3M5 12H2M22 12h-3" strokeLinecap="round" />
    </g>
  ),
  qwen: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 7h16M4 12h12M4 17h8" />
    </g>
  ),
};

interface ModelIconProps {
  modelId: string;
  size?: number;
  className?: string;
}

export function ModelIcon({ modelId, size = 14, className }: ModelIconProps) {
  const brand = getModelBrand(modelId);

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
