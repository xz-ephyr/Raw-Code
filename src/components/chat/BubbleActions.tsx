import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface TimelineSource {
  url: string;
  title: string;
  snippet?: string;
}

function SourcesFooter({ sources }: { sources: TimelineSource[] }) {
  const maxVisible = 4;
  const visible = sources.slice(0, maxVisible);
  const remaining = sources.length - maxVisible;

  if (sources.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center rounded-[6px] bg-muted/50 px-1.5 py-1">
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
                  className="no-underline -ml-1.5 first:ml-0"
                >
                  <img src={faviconUrl} alt={domain} width={14} height={14} className="rounded-full shrink-0" loading="lazy" onError={(e) => { (e.currentTarget).style.display = 'none'; }} />
                </a>
              );
            })}
          </div>
          {remaining > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground ml-1 shrink-0">+{remaining}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>{`${sources.length} source${sources.length > 1 ? 's' : ''}`}</TooltipContent>
    </Tooltip>
  );
}

interface BubbleActionsProps {
  allSources: TimelineSource[];
  version?: number;
  onCopy: () => void;
}

export const BubbleActions = React.memo(function BubbleActions({ allSources, version, onCopy }: BubbleActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3 text-foreground px-4" style={{ userSelect: 'none' }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className="hover:text-foreground transition-colors flex items-center"
            aria-label="Copy response"
          >
            {copied ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <Copy size={14} className="text-muted-foreground/60" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copied!' : 'Copy response'}</TooltipContent>
      </Tooltip>

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
    </TooltipProvider>
  );
});
