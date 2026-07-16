import { useState, useEffect, useRef, startTransition } from 'react';

export type WriteArtifactPhase = 'idle' | 'intention' | 'writing' | 'done';

export function useWriteArtifactStream(
  hasWriteArtifact: boolean,
  contentBeforeTool: string | undefined,
  isToolDone: boolean = true,
) {
  const [phase, setPhase] = useState<WriteArtifactPhase>('idle');
  const [intentionLen, setIntentionLen] = useState(0);
  const prevIntentionRef = useRef('');

  // Idle → done (skip animation when tool result already available and no intention to stream, e.g. loaded history)
  useEffect(() => {
    if (phase === 'idle' && hasWriteArtifact && isToolDone && !contentBeforeTool) {
      startTransition(() => setPhase('done'));
    }
  }, [hasWriteArtifact, isToolDone, contentBeforeTool, phase]);

  // Idle → intention (streams independently)
  useEffect(() => {
    if (!hasWriteArtifact || !contentBeforeTool) return;
    if (phase === 'idle') {
      startTransition(() => setPhase('intention'));
    }
  }, [hasWriteArtifact, contentBeforeTool, phase]);

  // Intention reveal animation
  useEffect(() => {
    if (phase !== 'intention' || !contentBeforeTool) return;
    const total = contentBeforeTool.length;
    if (total === 0) { startTransition(() => setPhase('writing')); return; }
    if (intentionLen >= total) { startTransition(() => setPhase('writing')); return; }
    if (contentBeforeTool !== prevIntentionRef.current && prevIntentionRef.current !== '') {
      prevIntentionRef.current = contentBeforeTool;
      startTransition(() => setIntentionLen(total));
      return;
    }
    prevIntentionRef.current = contentBeforeTool;
    const step = Math.max(1, Math.floor(total / 60));
    const t = setTimeout(() => setIntentionLen(l => Math.min(l + step, total)), 25);
    return () => clearTimeout(t);
  }, [phase, contentBeforeTool, intentionLen]);

  // Writing → done (when tool result arrives)
  useEffect(() => {
    if (phase === 'writing' && isToolDone) {
      startTransition(() => setPhase('done'));
    }
  }, [phase, isToolDone]);

  const streamedIntention = contentBeforeTool?.slice(0, intentionLen) || '';

  return { phase, streamedIntention };
}
