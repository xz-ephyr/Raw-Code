import { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

const words = [
  'Disentangling',
  'Extrapolating',
  'Reconnoitering',
  'Deconstructing',
  'Conceptualizing',
  'Interconnecting',
  'Troubleshooting',
  'Synchronizing',
  'Reconfiguring',
  'Disambiguating',
  'Contextualizing',
  'Parameterizing',
  'Systematizing',
  'Decentralizing',
  'Interoperating',
  'Overcomplicating',
  'Reconceptualizing',
  'Decontaminating',
  'Counterbalancing',
  'Electroforming',
];

function randomIndex() {
  return Math.floor(Math.random() * words.length);
}

interface ThinkingAnimationProps {
  supportsThinking?: boolean;
}

export function ThinkingAnimation({ supportsThinking }: ThinkingAnimationProps) {
  const [index, setIndex] = useState(randomIndex);

  useEffect(() => {
    if (!supportsThinking) return;
    const timer = setInterval(() => {
      setIndex(randomIndex);
    }, 2000);
    return () => clearInterval(timer);
  }, [supportsThinking]);

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <LoadingSpinner size={16} />
      {supportsThinking && (
        <span className="text-sm shimmer-text">{words[index]}</span>
      )}
    </div>
  );
}
