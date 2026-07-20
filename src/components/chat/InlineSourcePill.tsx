import { useState, useRef, useEffect } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface InlineSourcePillProps {
  url: string;
  title: string;
  snippet?: string;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function InlineSourcePill({ url, title, snippet }: InlineSourcePillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const domain = getDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

  return (
    <span ref={ref} className="inline-source-pill relative inline-flex items-center mx-0.5 align-middle">
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={show}
            onMouseLeave={hide}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center no-underline cursor-pointer"
            aria-label={`Source: ${title || domain}`}
          >
        <img src={faviconUrl} alt="" width={14} height={14} className="rounded-full shrink-0" loading="lazy" onError={(e) => { (e.currentTarget).style.display = 'none'; }} />
        <span className="sr-only">Opens in new tab</span>
      </a>
        </TooltipTrigger>
        <TooltipContent>{title || domain}</TooltipContent>
      </Tooltip>

      {isOpen && (
        <span
          onMouseEnter={show}
          onMouseLeave={hide}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-auto"
        >
          <span className="block bg-card border border-border rounded-lg shadow-lg p-3 min-w-[220px] max-w-[320px]">
            <span className="block text-xs font-medium text-foreground truncate mb-0.5">{title || domain}</span>
            <span className="block text-[11px] text-muted-foreground truncate mb-0.5">{snippet}</span>
            <span className="block text-[11px] text-muted-foreground truncate">{domain}</span>
            <span className="block absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-card border-l border-b border-border" />
          </span>
        </span>
      )}
    </span>
  );
}
