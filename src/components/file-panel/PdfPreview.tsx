import { useEffect, useState } from 'react';

interface PdfPreviewProps {
  content: string;
}

function isBase64(str: string): boolean {
  try { return btoa(atob(str)) === str; } catch { return false; }
}

export function PdfPreview({ content }: PdfPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setError(false);
      try {
        if (isBase64(content)) {
          try {
            const binary = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
            if (binary[0] === 0x25 && binary[1] === 0x50 && binary[2] === 0x44 && binary[3] === 0x46) {
              const blob = new Blob([binary.buffer as ArrayBuffer], { type: 'application/pdf' });
              objectUrl = URL.createObjectURL(blob);
              if (!cancelled) setUrl(objectUrl);
              return;
            }
          } catch { /* not valid base64 PDF, fall through */ }
        }

        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const text = content || '(No content)';
        const lines = text.split('\n');
        const fontSize = 11;
        const lineHeight = fontSize * 1.4;
        const maxLinesPerPage = 50;
        const margin = 50;

        for (let i = 0; i < lines.length; i += maxLinesPerPage) {
          const page = doc.addPage();
          const { height } = page.getSize();
          let y = height - margin;
          const chunk = lines.slice(i, i + maxLinesPerPage);
          for (const line of chunk) {
            page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= lineHeight;
          }
        }

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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
        <p>Could not render PDF preview</p>
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
      title="PDF Preview"
    />
  );
}
