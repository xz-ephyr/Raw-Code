import { useState } from 'react';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  ArrowTurnBackwardIcon,
  Copy01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import type { TimelineSource } from './ThinkingTimeline';

function SourcesFooter({ sources }: { sources: TimelineSource[] }) {
  const maxVisible = 4;
  const visible = sources.slice(0, maxVisible);
  const remaining = sources.length - maxVisible;

  if (sources.length === 0) return null;

  return (
    <div className="flex items-center rounded-[6px] bg-muted/50 px-1.5 py-1" title="Sources used">
      <div className="flex items-center">
        {visible.map((src, i) => {
          let domain = '';
          try { domain = new URL(src.url).hostname.replace(/^www\./, ''); } catch { domain = src.url; }
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
          return (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              title={src.title || src.url}
              className="no-underline -ml-1.5 first:ml-0"
            >
              <img src={faviconUrl} alt={domain} width={14} height={14} className="rounded-full shrink-0" loading="lazy" onError={(e) => { (e.currentTarget).style.display = 'none'; }} />
            </a>
          );
        })}
      </div>
      {remaining > 0 && (
        <span
          className="text-[10px] font-medium text-muted-foreground ml-1 shrink-0"
          title={`${remaining} more source${remaining > 1 ? 's' : ''}`}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}

interface BubbleActionsProps {
  allSources: TimelineSource[];
  model?: string;
  version?: number;
  onCopy: () => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
}

export function BubbleActions({ allSources, model, version, onCopy, onThumbsUp, onThumbsDown, onRegenerate }: BubbleActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 text-foreground px-4">
      <button
        type="button"
        onClick={handleCopy}
        className="hover:text-foreground transition-colors"
        title={copied ? 'Copied!' : 'Copy response'}
        aria-label={copied ? 'Copied!' : 'Copy response'}
      >
        <HugeiconRenderer
          icon={copied ? Tick01Icon : Copy01Icon}
          size={18}
          className={copied ? 'text-green-600' : ''}
        />
      </button>
      <button
        type="button"
        onClick={onThumbsUp}
        className="hover:text-foreground transition-colors"
        title="Good response"
        aria-label="Good response"
      >
        <HugeiconRenderer icon={ThumbsUpIcon} size={18} />
      </button>
      <button
        type="button"
        onClick={onThumbsDown}
        className="hover:text-foreground transition-colors"
        title="Bad response"
        aria-label="Bad response"
      >
        <HugeiconRenderer icon={ThumbsDownIcon} size={18} />
      </button>
      <button
        type="button"
        onClick={onRegenerate}
        className="hover:text-foreground transition-colors"
        title="Regenerate response"
        aria-label="Regenerate response"
      >
        <HugeiconRenderer icon={ArrowTurnBackwardIcon} size={18} />
      </button>

      {version !== undefined && version > 1 && (
        <span className="text-[11px] font-medium text-muted-foreground/70 ml-0">v{version}</span>
      )}

      {allSources.length > 0 && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <SourcesFooter sources={allSources} />
        </>
      )}
    </div>
  );
}
