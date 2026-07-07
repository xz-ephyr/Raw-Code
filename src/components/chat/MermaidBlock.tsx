import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

interface MermaidBlockProps {
  content: string;
}

export function MermaidBlock({ content }: MermaidBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        setError(null);
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: result } = await mermaid.render(id, content);
        if (!cancelled) setSvg(result);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to render diagram');
          setSvg(null);
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [content]);

  if (error) {
    return (
      <div className="my-4 p-3 rounded-[6px] bg-red-950/20 border border-red-800/30 text-xs text-red-400">
        <div className="font-semibold mb-1">Diagram render error:</div>
        <pre className="whitespace-pre-wrap font-mono text-[11px]">{error}</pre>
        <details className="mt-2">
          <summary className="cursor-pointer text-red-400/70 hover:text-red-400">Raw source</summary>
          <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-red-300/60">{content}</pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 p-4 rounded-[6px] bg-muted/50 animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-4 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
      role="img"
      aria-label="Diagram"
    />
  );
}
