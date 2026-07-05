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
    <div className="flex items-center" title="Sources used">
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
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-card hover:bg-muted 
                       border border-border transition-colors no-underline -ml-1 first:ml-0
                       shadow-sm hover:shadow-md"
          >
            <img src={faviconUrl} alt={domain} width={12} height={12} className="rounded" loading="lazy" />
          </a>
        );
      })}
      {remaining > 0 && (
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full -ml-1
                      bg-muted border border-border 
                     text-[10px] font-medium text-muted-foreground shrink-0"
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
  onCopy: () => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
}

export function BubbleActions({ allSources, model, onCopy, onThumbsUp, onThumbsDown, onRegenerate }: BubbleActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 text-muted-foreground px-4">
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

      {allSources.length > 0 && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <SourcesFooter sources={allSources} />
        </>
      )}

      {model && (
        <span className="text-xs text-muted-foreground">{model}</span>
      )}
    </div>
  );
}
