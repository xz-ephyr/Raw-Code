import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GoogleDocIcon, Download01Icon } from '@hugeicons/core-free-icons';
import { FILE_TYPE_LABELS, FILE_MIME_TYPES } from '@/types/file-panel';
import type { FileItem, FileType } from '@/types/file-panel';
import { useCallback } from 'react';


interface FilePreviewCardProps {
  file: FileItem;
  onClick: () => void;
}

export const FilePreviewCard = React.memo(function FilePreviewCard({ file, onClick }: FilePreviewCardProps) {
  const handleDownload = useCallback(async () => {
    const ext = getFileExtension(file);
    const blob = await toDownloadBlob(file);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.identifier}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="flex items-center gap-3 w-full h-[75px] px-4 rounded-lg border border-border cursor-pointer hover:bg-muted focus-visible:bg-muted active:bg-accent active:scale-[0.98] active:shadow-inner transition-all text-left"
    >
      <div className="flex items-center justify-center w-10 h-10 shrink-0">
        {FILE_ICONS[file.type] ? (
          <>
            <img src={FILE_ICONS[file.type]} alt={FILE_TYPE_LABELS[file.type]} loading="lazy" className="w-10 h-10 dark:hidden" />
            {FILE_ICONS_DARK[file.type] && (
              <img src={FILE_ICONS_DARK[file.type]} alt={FILE_TYPE_LABELS[file.type]} loading="lazy" className="w-10 h-10 hidden dark:block" />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center w-10 h-10 rounded-md text-muted-foreground">
            <HugeiconsIcon icon={GoogleDocIcon} size={24} className="-rotate-[15deg]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {file.title}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {FILE_TYPE_LABELS[file.type]} &middot; Click to view
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted text-foreground hover:bg-accent active:bg-muted-foreground active:scale-95 transition-all"
      >
        <HugeiconsIcon icon={Download01Icon} size={16} />
        Download
      </button>
    </div>
  );
});

function getFileExtension(file: FileItem): string {
  switch (file.type) {
    case 'markdown': return 'md';
    case 'doc': return 'doc';
    case 'pptx': return 'pptx';
    case 'excel': return 'xlsx';
    case 'pdf': return 'pdf';
    default: return 'txt';
  }
}

function isBinaryType(type: FileType): boolean {
  return type === 'pdf' || type === 'doc' || type === 'pptx' || type === 'excel';
}

const FILE_ICONS: Partial<Record<FileType, string>> = {
  pdf: '/pdf.svg',
  doc: '/google-docs.svg',
  pptx: '/pptx.svg',
  excel: '/excel.svg',
};

const FILE_ICONS_DARK: Partial<Record<FileType, string>> = {
  pdf: '/pdf-dark.svg',
  pptx: '/pptx-dark.svg',
};

async function toDownloadBlob(file: FileItem): Promise<Blob> {
  const mime = FILE_MIME_TYPES[file.type] || 'text/plain';
  if (isBinaryType(file.type)) {
    try {
      const binary = Uint8Array.from(atob(file.content), (c) => c.charCodeAt(0));
      return new Blob([binary.buffer as ArrayBuffer], { type: mime });
    } catch { /* not base64 — generate from text */ }
  }
  if (!isBinaryType(file.type)) {
    return new Blob([file.content], { type: mime });
  }
  return generateFile(file, mime);
}

async function generateFile(file: FileItem, mime: string): Promise<Blob> {
  switch (file.type) {
    case 'pdf': return generatePdfBlob(file.content, mime);
    case 'doc': return generateDocBlob(file.content, mime);
    case 'pptx': return generatePptxBlob(file.content, mime);
    case 'excel': return generateExcelBlob(file.content, mime);
    default: return new Blob([file.content], { type: mime });
  }
}

async function generatePdfBlob(content: string, mime: string): Promise<Blob> {
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
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: mime });
}

function generateDocBlob(content: string, mime: string): Blob {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.6}</style></head>
<body>${content.split('\n').map(line => {
    if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
    if (line.trim() === '') return '<br>';
    return `<p>${line}</p>`;
  }).join('\n')}</body></html>`;
  return new Blob([html], { type: mime });
}

async function generatePptxBlob(content: string, mime: string): Promise<Blob> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  const slides = content.split(/(?:^|\n)---(?:\n|$)/).map(s => s.trim()).filter(Boolean);
  if (slides.length === 0) slides.push(content.trim() || 'Untitled');
  for (const slideText of slides) {
    const slide = pres.addSlide();
    const lines = slideText.split('\n').filter(l => l.trim());
    const title = lines[0]?.replace(/^#+\s*/, '') || 'Slide';
    const body = lines.slice(1).filter(l => l.trim());
    slide.background = { color: 'FFFFFF' };
    slide.addText(title, { x: 0.5, y: 0.3, w: 9, h: 1, fontSize: 28, fontFace: 'Arial', color: '1a1a1a', bold: true });
    slide.addText(body.join('\n'), { x: 0.5, y: 1.5, w: 9, h: 5, fontSize: 16, fontFace: 'Arial', color: '333333', valign: 'top' });
  }
  const raw = await pres.write({ outputType: 'arraybuffer' }) as any;
  const bytes = new Uint8Array(raw.buffer || raw);
  return new Blob([bytes], { type: mime });
}

async function generateExcelBlob(content: string, mime: string): Promise<Blob> {
  const XLSX = await import('xlsx');
  const lines = content.split('\n').filter(l => l.trim());
  const tableLines = lines.filter(l => l.includes('|'));
  if (tableLines.length < 2) {
    const ws = XLSX.utils.aoa_to_sheet([['Content'], [content.slice(0, 32767)]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Blob([buf], { type: mime });
  }
  const rows: string[][] = [];
  for (const line of tableLines) {
    const sep = line.replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    if (sep.every(s => /^[-:\s]+$/.test(s))) continue;
    rows.push(sep);
  }
  if (rows.length === 0) rows.push([content.slice(0, 32767)]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: mime });
}
