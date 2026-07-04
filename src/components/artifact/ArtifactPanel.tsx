import { useState, useCallback, useMemo } from 'react';
import type { Artifact } from '@/types/artifact';
import { ARTIFACT_TYPE_LABELS } from '@/types/artifact';
import type { TabId } from './ArtifactTabs';
import { CodePreview } from './CodePreview';
import { MarkdownPreview } from './MarkdownPreview';
import { MermaidPreview } from './MermaidPreview';
import { SvgPreview } from './SvgPreview';
import { HtmlPreview } from './HtmlPreview';
import { ReactPreview } from './ReactPreview';
import { CloseIcon, CopyIcon, DownloadIcon } from './icons';

interface ArtifactPanelProps {
  artifacts: Artifact[];
  activeArtifactId: string | null;
  onSelectArtifact: (id: string) => void;
  onClose: () => void;
  onRegenerate: (prompt: string) => void;
  onRollback: (identifier: string, version: number) => void;
}

export function ArtifactPanel({
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onClose,
  onRegenerate,
  onRollback: _onRollback,
}: ArtifactPanelProps) {
  void _onRollback;
  const [activeTab, setActiveTab] = useState<TabId>('preview');

  const activeArtifact = useMemo(() => {
    if (activeArtifactId) {
      return artifacts.find((a) => a.identifier === activeArtifactId) || artifacts[0];
    }
    return artifacts[0];
  }, [artifacts, activeArtifactId]);

  const currentIndex = useMemo(() => {
    return artifacts.findIndex((a) => a.identifier === activeArtifact?.identifier);
  }, [artifacts, activeArtifact]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prev = artifacts[currentIndex - 1];
      onSelectArtifact(prev.identifier);
    }
  }, [currentIndex, artifacts, onSelectArtifact]);

  const handleNext = useCallback(() => {
    if (currentIndex < artifacts.length - 1) {
      const next = artifacts[currentIndex + 1];
      onSelectArtifact(next.identifier);
    }
  }, [currentIndex, artifacts, onSelectArtifact]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  const handleCopy = useCallback(async () => {
    if (activeArtifact) {
      await navigator.clipboard.writeText(activeArtifact.content);
    }
  }, [activeArtifact]);

  const handleDownload = useCallback(() => {
    if (!activeArtifact) return;
    const ext = getFileExtension(activeArtifact);
    const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeArtifact.identifier}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeArtifact]);

  const handleFixWithClaude = useCallback((error: string) => {
    if (activeArtifact) {
      onRegenerate(`Fix this ${ARTIFACT_TYPE_LABELS[activeArtifact.type].toLowerCase()} artifact (error: ${error}):\n\n${activeArtifact.content}`);
    }
  }, [activeArtifact, onRegenerate]);

  if (!activeArtifact) return null;

  const renderPreview = () => {
    switch (activeArtifact.type) {
      case 'code':
        return <CodePreview content={activeArtifact.content} language={activeArtifact.language} />;
      case 'markdown':
        return <MarkdownPreview content={activeArtifact.content} />;
      case 'mermaid':
        return <MermaidPreview content={activeArtifact.content} onError={handleFixWithClaude} />;
      case 'svg':
        return <SvgPreview content={activeArtifact.content} />;
      case 'html':
        return <HtmlPreview content={activeArtifact.content} onError={handleFixWithClaude} />;
      case 'react':
        return <ReactPreview content={activeArtifact.content} onError={handleFixWithClaude} />;
      default:
        return <CodePreview content={activeArtifact.content} language={activeArtifact.language} />;
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-[#2a2a2a] border-l border-neutral-700"
      style={{ width: '100%', minWidth: 0 }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider shrink-0">
            {ARTIFACT_TYPE_LABELS[activeArtifact.type]}
          </span>
          <span className="text-sm font-medium text-neutral-200 truncate">
            {activeArtifact.title}
          </span>
          {artifacts.length > 1 && (
            <span className="text-xs text-neutral-400 shrink-0">
              {currentIndex + 1}/{artifacts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'preview'
                  ? 'bg-neutral-700 text-neutral-200 shadow-sm shadow-black/20'
                  : 'text-neutral-400 hover:text-neutral-300'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'code'
                  ? 'bg-neutral-700 text-neutral-200 shadow-sm shadow-black/20'
                  : 'text-neutral-400 hover:text-neutral-300'
              }`}
            >
              Code
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-300 transition-colors"
            title="Copy artifact content"
          >
            <CopyIcon />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-300 transition-colors"
            title="Download artifact"
          >
            <DownloadIcon />
          </button>
          <div className="w-px h-4 bg-neutral-700 mx-1" />
          {artifacts.length > 1 && (
            <div className="flex items-center gap-1 mr-1">
              <button
                onClick={handlePrevious}
                disabled={currentIndex <= 0}
                className="p-1 rounded-md hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400"
                title="Previous artifact"
              >
                <ChevronLeftIcon />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= artifacts.length - 1}
                className="p-1 rounded-md hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400"
                title="Next artifact"
              >
                <ChevronRightIcon />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-300 transition-colors"
            title="Close artifact panel (Esc)"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && (
          <div className="h-full overflow-auto thin-scrollbar">{renderPreview()}</div>
        )}
        {activeTab === 'code' && (
          <div className="h-full overflow-auto thin-scrollbar">
            <CodePreview content={activeArtifact.content} language={activeArtifact.language} />
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getFileExtension(artifact: Artifact): string {
  switch (artifact.type) {
    case 'code': return artifact.language || 'txt';
    case 'html': return 'html';
    case 'react': return 'tsx';
    case 'svg': return 'svg';
    case 'mermaid': return 'mmd';
    case 'markdown': return 'md';
    default: return 'txt';
  }
}
