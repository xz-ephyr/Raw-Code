import { useEffect, useState } from 'react';

interface PptxPreviewProps {
  content: string;
}

function parseSlides(text: string): string[] {
  const raw = text.split(/(?:^|\n)---(?:\n|$)/).map(s => s.trim()).filter(Boolean);
  return raw.length > 0 ? raw : [text.trim()];
}

export function PptxPreview({ content }: PptxPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setError(false);
      try {
        const slides = parseSlides(content);
        const slidesHtml = slides.map((slide) => {
          const lines = slide.split('\n');
          const title = lines[0].replace(/^#+\s*/, '');
          const body = lines.slice(1).filter(l => l.trim()).map(l => {
            if (l.startsWith('- ')) return `<li>${l.slice(2)}</li>`;
            if (l.startsWith('  - ')) return `<li style="margin-left:24px">${l.slice(4)}</li>`;
            return `<p>${l}</p>`;
          }).join('\n');
          return `<div class="slide">${title ? `<h1>${title}</h1>` : ''}${body ? `<div class="body">${body}</div>` : ''}</div>`;
        }).join('\n');

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; display: flex; align-items: center; min-height: 100vh; }
  .deck { width: 100%; max-width: 960px; margin: 0 auto; padding: 20px; }
  .slide { background: white; border-radius: 8px; padding: 48px 56px; margin-bottom: 24px; min-height: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
  h1 { font-family: 'Segoe UI', Arial, sans-serif; font-size: 28pt; font-weight: 600; color: #1a1a1a; margin-bottom: 24px; }
  p { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14pt; line-height: 1.6; color: #333; margin: 8px 0; }
  li { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14pt; line-height: 1.6; color: #333; margin: 4px 0; list-style: disc; margin-left: 20px; }
</style>
</head>
<body>
<div class="deck">${slidesHtml}</div>
</body>
</html>`;
        const blob = new Blob([html], { type: 'text/html' });
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [content]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40 text-sm">
        <p>Could not render presentation preview</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="w-full h-full border-none rounded-[3px] shadow-[0_2px_24px_rgba(0,0,0,0.6)]"
      title="Presentation Preview"
    />
  );
}
