import { useEffect, useState } from 'react';

interface ExcelPreviewProps {
  content: string;
}

function parseTable(text: string): string[][] {
  const lines = text.split('\n').filter(l => l.trim());
  const tableLines = lines.filter(l => l.includes('|'));
  if (tableLines.length < 2) {
    return [['Content'], [text.slice(0, 200)]];
  }
  const rows: string[][] = [];
  for (const line of tableLines) {
    const sep = line.replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    if (sep.every(s => /^[-:\s]+$/.test(s))) continue;
    rows.push(sep);
  }
  return rows.length > 0 ? rows : [['Content'], [text.slice(0, 200)]];
}

export function ExcelPreview({ content }: ExcelPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setError(false);
      try {
        const rows = parseTable(content);
        const rowsHtml = rows.map((row, i) => {
          const cells = row.map(c => `<${i === 0 ? 'th' : 'td'}>${c || ''}</${i === 0 ? 'th' : 'td'}>`).join('');
          return `<tr>${cells}</tr>`;
        }).join('\n');

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; display: flex; align-items: flex-start; min-height: 100vh; padding: 40px 20px; }
  table { width: 100%; max-width: 960px; margin: 0 auto; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.3); font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
  th { background: #f3f4f6; font-weight: 600; color: #374151; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; }
  td { padding: 10px 16px; color: #1f2937; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f9fafb; }
</style>
</head>
<body>
<table><thead><tr>${rowsHtml.match(/<tr>.*?<\/tr>/)?.[0] || ''}</tr></thead><tbody>${rowsHtml.replace(/<tr>.*?<\/tr>/, '')}</tbody></table>
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
        <p>Could not render spreadsheet preview</p>
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
      title="Spreadsheet Preview"
    />
  );
}
