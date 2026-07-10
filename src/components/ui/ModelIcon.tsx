interface ModelIconProps {
  modelId: string;
  size?: number;
  className?: string;
}

export function ModelIcon({ modelId: _modelId, className }: ModelIconProps) {
  return <span className={className} aria-hidden="true" />;
}
