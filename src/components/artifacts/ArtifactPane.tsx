import { useState } from 'react';
import {
  Cancel01Icon,
  Download01Icon,
  ArrowDown01Icon,
  CodeIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Artifact } from '../../hooks/useArtifacts';
import { ArtifactRenderer } from './ArtifactRenderer';
import { isTauri } from '../../lib/tauri';

interface ArtifactPaneProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  onVersionSelect: (artifact: Artifact) => void;
}

const HugeiconRenderer = ({
  icon: Icon,
  size = 18,
  className,
}: {
  icon: any;
  size?: number;
  className?: string;
}) => (
  <HugeiconsIcon
    icon={Icon}
    size={size}
    color="currentColor"
    strokeWidth={1.5}
    className={className}
  />
);

export const ArtifactPane: React.FC<ArtifactPaneProps> = ({
  isOpen,
  onClose,
  artifacts,
  activeArtifact,
  onVersionSelect,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [view, setView] = useState<'preview' | 'code'>('preview');

  if (!isOpen || !activeArtifact) return null;

  const handleDownload = async () => {
    try {
      if (isTauri()) {
        // Desktop path: use native save dialog
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const path = await save({
          defaultPath: activeArtifact.title,
          filters: [{ name: 'All Files', extensions: ['*'] }],
        });
        if (path) {
          await writeTextFile(path, activeArtifact.content);
        }
      } else {
        // Web path: browser blob download
        const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeArtifact.title;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="w-full h-full border-l border-neutral-200 bg-white flex flex-col z-10">
      <div className="h-14 border-b border-neutral-200 px-4 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-neutral-100 rounded-md transition-colors text-sm font-medium text-neutral-700"
            >
              v{activeArtifact.version}
              <HugeiconRenderer
                icon={ArrowDown01Icon}
                size={14}
                className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
                {[...artifacts].reverse().map((a) => (
                  <button
                    key={a.version}
                    onClick={() => {
                      onVersionSelect(a);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 flex items-center justify-between ${a.version === activeArtifact.version ? 'bg-neutral-50 text-black font-medium' : 'text-neutral-600'}`}
                  >
                    Version {a.version}
                    {a.version === activeArtifact.version && (
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <h2 className="text-sm font-semibold text-neutral-900 truncate max-w-[200px]">
            {activeArtifact.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg mr-2">
            <button
              onClick={() => setView('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                view === 'preview'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <HugeiconRenderer icon={ViewIcon} size={12} />
              Preview
            </button>
            <button
              onClick={() => setView('code')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                view === 'code'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <HugeiconRenderer icon={CodeIcon} size={12} />
              Code
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="p-2 hover:bg-neutral-100 rounded-md transition-colors text-neutral-600 hover:text-black"
            title="Download"
          >
            <HugeiconRenderer icon={Download01Icon} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-md transition-colors text-neutral-600 hover:text-black"
            title="Close"
          >
            <HugeiconRenderer icon={Cancel01Icon} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ArtifactRenderer type={activeArtifact.type} content={activeArtifact.content} mode={view} />
      </div>
    </div>
  );
};
