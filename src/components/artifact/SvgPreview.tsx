import { useMemo, useState } from 'react';

interface SvgPreviewProps {
  content: string;
}

export function SvgPreview({ content }: SvgPreviewProps) {
  const [error, setError] = useState(false);

  const svgContent = useMemo(() => {
    const trimmed = content.trim();
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
      return trimmed;
    }

    const svgMatch = trimmed.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      return svgMatch[0];
    }

    return null;
  }, [content]);

  if (error || !svgContent) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-900/20 border-red-800 p-4">
          <p className="text-sm font-medium text-red-800 text-red-300">
            {error ? 'Failed to render SVG' : 'No valid SVG found in content'}
          </p>
        </div>
        <pre className="mt-4 p-4 bg-neutral-900 bg-neutral-900 rounded-lg border border-neutral-700 border-neutral-700 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64 text-neutral-300">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-[200px]">
      <div
        className="max-w-full overflow-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        onError={() => setError(true)}
      />
    </div>
  );
}
