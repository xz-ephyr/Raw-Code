import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import IDEShell from '../../ide/IDEShell';
import ResizeDivider from '../layout/ResizeDivider';
import type { ProjectFileEntry } from '../../ide/types';
import type { MouseEvent, TouchEvent, KeyboardEvent } from 'react';

interface IDEPanelProps {
  isOpen: boolean;
  isMobile: boolean;
  panelWidth: number;
  projectName?: string;
  projectFiles: ProjectFileEntry[];
  onClose: () => void;
  onMouseDown: (e: MouseEvent) => void;
  onTouchStart: (e: TouchEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  panelMinWidth: number;
  panelMaxWidth: number;
}

export default function IDEPanel({
  isOpen,
  isMobile,
  panelWidth,
  projectName,
  projectFiles,
  onClose,
  onMouseDown,
  onTouchStart,
  onKeyDown,
  panelMinWidth,
  panelMaxWidth,
}: IDEPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="flex overflow-hidden min-w-0" style={{ width: panelWidth, flex: 'none' }}>
      <ResizeDivider
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onKeyDown={onKeyDown}
        ariaValueNow={panelWidth}
        ariaValueMin={panelMinWidth}
        ariaValueMax={panelMaxWidth}
      />
      {isMobile && (
        <div className="absolute inset-0 z-50 bg-black/30" onClick={onClose} />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm font-semibold">IDE</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-[6px] text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close IDE panel"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <IDEShell projectName={projectName} projectFiles={projectFiles} />
        </div>
      </div>
    </div>
  );
}
