import { useEffect, useState } from 'react';

interface DocPreviewProps {
  content: string;
}

export function DocPreview({ content }: DocPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setError(false);
      try {
        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 60px auto; }
  h1 { font-size: 22pt; font-weight: 600; margin-top: 28px; margin-bottom: 14px; }
  h2 { font-size: 16pt; font-weight: 600; margin-top: 22px; margin-bottom: 10px; }
  h3 { font-size: 13pt; font-weight: 600; margin-top: 18px; margin-bottom: 8px; }
  p { margin: 6px 0; }
</style>
</head>
<body>
${content.split('\n').map(line => {
  if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
  if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
  if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
  if (line.startsWith('- ')) return `<p style="margin-left:20px">• ${line.slice(2)}</p>`;
  if (line.trim() === '') return '<p style="margin:12px 0"></p>';
  return `<p>${line}</p>`;
}).join('\n')}
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
        <p>Could not render document preview</p>
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
      className="w-full h-full border-none rounded-[3px] shadow-[0_2px_24px_rgba(0,0,0,0.6)] bg-white max-w-[900px] mx-auto"
      title="Document Preview"
    />
  );
}
