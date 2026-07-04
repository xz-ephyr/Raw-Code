import { useState, useEffect, useRef, startTransition } from 'react';

export type WriteArtifactPhase = 'idle' | 'intention' | 'shimmer' | 'explanation' | 'done';

export function useWriteArtifactStream(
  hasWriteArtifact: boolean,
  contentBeforeTool: string | undefined,
  contentAfterTool: string | undefined,
  content: string,
) {
  const [phase, setPhase] = useState<WriteArtifactPhase>('idle');
  const [intentionLen, setIntentionLen] = useState(0);
  const [explanationLen, setExplanationLen] = useState(0);
  const prevIntentionRef = useRef('');
  const prevExplanationRef = useRef('');
  const contentAfterToolRef = useRef(contentAfterTool);
  contentAfterToolRef.current = contentAfterTool;

  // Idle → intention/shimmer/done
  useEffect(() => {
    if (!hasWriteArtifact || !contentBeforeTool) return;
    if (phase === 'idle') {
      if (content && content.startsWith(contentBeforeTool)) {
        startTransition(() => setIntentionLen(contentBeforeTool.length));
        if (contentAfterTool && content.includes(contentAfterTool)) {
          startTransition(() => {
            setExplanationLen(contentAfterTool.length);
            setPhase('done');
          });
          return;
        }
        startTransition(() => setPhase('shimmer'));
        return;
      }
      startTransition(() => setPhase('intention'));
    }
  }, [hasWriteArtifact, contentBeforeTool, phase, content, contentAfterTool]);

  // Intention reveal animation
  useEffect(() => {
    if (phase !== 'intention' || !contentBeforeTool) return;
    const total = contentBeforeTool.length;
    if (total === 0) { startTransition(() => setPhase('shimmer')); return; }
    if (intentionLen >= total) { startTransition(() => setPhase('shimmer')); return; }
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

  // Shimmer → explanation (or done if nothing to explain)
  useEffect(() => {
    if (phase !== 'shimmer') return;
    startTransition(() => setExplanationLen(0));
    const t = setTimeout(() => {
      if (!contentAfterToolRef.current) {
        startTransition(() => setPhase('done'));
      } else {
        startTransition(() => setPhase('explanation'));
      }
    }, 600);
    return () => clearTimeout(t);
  }, [phase]);

  // Explanation reveal animation
  useEffect(() => {
    if (phase !== 'explanation') return;
    if (!contentAfterTool) {
      startTransition(() => setPhase('done'));
      return;
    }
    const total = contentAfterTool.length;
    if (total === 0) { startTransition(() => setPhase('done')); return; }
    if (explanationLen >= total) { startTransition(() => setPhase('done')); return; }
    if (contentAfterTool !== prevExplanationRef.current && prevExplanationRef.current !== '') {
      prevExplanationRef.current = contentAfterTool;
      startTransition(() => setExplanationLen(total));
      return;
    }
    prevExplanationRef.current = contentAfterTool;
    const step = Math.max(1, Math.floor(total / 60));
    const t = setTimeout(() => setExplanationLen(l => Math.min(l + step, total)), 25);
    return () => clearTimeout(t);
  }, [phase, contentAfterTool, explanationLen]);

  const streamedIntention = contentBeforeTool?.slice(0, intentionLen) || '';
  const streamedExplanation = contentAfterTool?.slice(0, explanationLen) || '';

  return {
    phase,
    streamedIntention,
    streamedExplanation,
  };
}
