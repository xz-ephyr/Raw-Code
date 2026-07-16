import React, { useState, useMemo } from 'react';
import type { FileItem } from '@/types/file-panel';
import { PdfPreview } from './PdfPreview';
import { DocPreview } from './DocPreview';
import { PptxPreview } from './PptxPreview';
import { ExcelPreview } from './ExcelPreview';

interface FilePanelProps {
  files: FileItem[];
  activeFileId: string | null;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export const FilePanel = React.memo(function FilePanel({
  files,
  activeFileId,
  onClose,
}: FilePanelProps) {
  const [zoom, setZoom] = useState(100);

  const activeFile = useMemo(() => {
    if (activeFileId) {
      return files.find((a) => a.identifier === activeFileId) || files[0];
    }
    return files[0];
  }, [files, activeFileId]);

  if (!activeFile) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <span className="text-[13px] font-medium text-white/70 truncate tracking-wide">
          {activeFile.title}
        </span>
        <div className="flex items-center gap-3">
          {activeFile.type !== 'pdf' && (
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min={50}
                max={200}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-16 h-[3px] appearance-none bg-white/10 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/70"
              />
              <span className="text-[11px] text-white/40 w-7 text-right tabular-nums">{zoom}%</span>
            </div>
          )}
          <div className="w-px h-3.5 bg-white/[0.08]" />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto w-full thin-scrollbar p-5 flex flex-col items-center">
        {activeFile.type === 'pdf' ? (
          <PdfPreview content={activeFile.content} />
        ) : activeFile.type === 'doc' ? (
          <DocPreview content={activeFile.content} />
        ) : activeFile.type === 'pptx' ? (
          <PptxPreview content={activeFile.content} />
        ) : activeFile.type === 'excel' ? (
          <ExcelPreview content={activeFile.content} />
        ) : (
          <pre
            className="w-full min-h-full text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap break-words font-sans"
            style={{ fontSize: `${zoom * 0.13}px` }}
          >{activeFile.content || ''}</pre>
        )}
      </div>
    </div>
  );
});
