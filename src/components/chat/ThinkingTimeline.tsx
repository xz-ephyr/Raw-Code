import React, { useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronsDownUpIcon, InternetIcon } from '@hugeicons/core-free-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const REMARK_PLUGINS = [remarkGfm];

// ── Types ──────────────────────────────────────────────────────────

export interface TimelineSource {
  url: string;
  title: string;
  snippet?: string;
}

export interface TimelineStep {
  id: string;
  type: 'thinking' | 'searching';
  /** For thinking: the full reasoning text so far */
  reasoning?: string;
  /** For searching: the search query */
  query?: string;
  /** For searching: whether the search is still running */
  isRunning?: boolean;
  /** For searching: source URLs from completed results */
  sources?: TimelineSource[];
  /** Whether this step is the currently active one (receiving updates) */
  isActive: boolean;
}

interface ThinkingTimelineProps {
  steps: TimelineStep[];
  isStreaming: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function buildSourcesFromResult(outputOrResult: any): TimelineSource[] {
  const sources: TimelineSource[] = [];
  const results = outputOrResult?.results;
  if (!results) return sources;
  for (const r of results) {
    if (r.url) {
      sources.push({ url: r.url, title: r.title || r.snippet || '', snippet: r.snippet });
    }
  }
  return sources;
}

// ── Sub-components ─────────────────────────────────────────────────

function SearchingHeader({
  query,
  isRunning,
  onToggle,
}: {
  query: string;
  isRunning: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 pr-3 py-0.5 rounded-[6px] cursor-pointer select-none transition-all active:scale-[0.98] group/searchheader ${
        isRunning ? 'bg-blue-900/40 active:bg-blue-900/60' : 'hover:bg-white/10 active:bg-white/15'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-center w-5 h-5 shrink-0">
        <HugeiconsIcon
          icon={InternetIcon}
          size={12}
          className={isRunning ? 'text-blue-400' : 'text-white/50'}
        />
      </div>
      <span
        className={
          isRunning
            ? 'thinking-shimmer-text text-xs font-medium text-white font-inter'
            : 'text-xs font-medium text-white/60 font-inter'
        }
      >
        Searching
      </span>
      {query && (
        <span className="text-sm font-medium text-white/70 truncate max-w-[400px]">
          &ldquo;{query}&rdquo;
        </span>
      )}
      <HugeiconsIcon
        icon={ChevronsDownUpIcon}
        size={12}
        className="text-white/40 ml-auto opacity-0 group-hover/searchheader:opacity-100 transition-opacity cursor-pointer"
      />
    </div>
  );
}

function ThinkingStep({ reasoning, isActive, isStreaming }: {
  reasoning?: string;
  isActive: boolean;
  isStreaming: boolean;
}) {
  const showEllipsis = isActive && isStreaming;
  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0 pb-3">
      <div className="text-[12px] leading-relaxed text-white/90 [&>p]:my-0 font-inter">
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>
          {reasoning || ''}
        </ReactMarkdown>
      </div>
      {showEllipsis && (
        <div className="text-[13px] leading-relaxed text-white/50 animate-pulse">...</div>
      )}
    </div>
  );
}

function SearchingStep({ step, isExpanded, onToggle }: {
  step: TimelineStep;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const sources = step.sources || [];
  return (
    <div className="pb-3">
      <SearchingHeader query={step.query || ''} isRunning={!!step.isRunning} onToggle={onToggle} />

      {step.isRunning && (
        <div className="flex items-center gap-1.5 px-2 text-xs text-white/50 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          Fetching results...
        </div>
      )}

      {!step.isRunning && sources.length > 0 && (
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="border border-white/10 rounded-[6px] overflow-y-auto max-h-[240px] thin-scrollbar mx-[5px]">
              {sources.map((src, sIdx) => (
                <a
                  key={sIdx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-2 h-[36px] rounded-[6px] hover:bg-white/10 transition-colors no-underline"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${getDomain(src.url)}&sz=16`}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded shrink-0"
                  />
                  <span className="text-sm text-white/80 truncate">{src.title || src.url}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export const ThinkingTimeline = React.memo(function ThinkingTimeline({
  steps,
  isStreaming,
}: ThinkingTimelineProps) {
  const [expandedSearch, setExpandedSearch] = useState<Set<string>>(new Set());

  if (steps.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedSearch((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step) => {
        if (step.type === 'thinking') {
          return (
            <div key={step.id} className="flex">
              <ThinkingStep reasoning={step.reasoning} isActive={step.isActive} isStreaming={isStreaming} />
            </div>
          );
        }
        if (step.type === 'searching') {
          return (
            <SearchingStep
              key={step.id}
              step={step}
              isExpanded={expandedSearch.has(step.id)}
              onToggle={() => toggleExpand(step.id)}
            />
          );
        }
        return null;
      })}
    </div>
  );
});

// ── Hook to build timeline steps from raw props ────────────────────

function extractThinkTagsFromText(text: string): { clean: string; thinking: string } {
  const thinkingParts: string[] = [];
  let clean = text;

  const fullRegex = /<think>([\s\S]*?)<\/think>/gi;
  let match: RegExpExecArray | null;
  const regex = new RegExp(fullRegex.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    thinkingParts.push(match[1].trim());
    clean = clean.replace(match[0], '');
  }

  if (!text.includes('</think>')) {
    const incompleteRegex = /<think>([\s\S]*?)$/i;
    const incompleteMatch = incompleteRegex.exec(clean);
    if (incompleteMatch) {
      thinkingParts.push(incompleteMatch[1].trim());
      clean = clean.replace(incompleteMatch[0], '');
    }
  }

  return { clean: clean.trim(), thinking: thinkingParts.join('\n') };
}

function buildStepsFromParts(
  parts: any[],
  toolInvocations: any[] | undefined,
  isStreaming: boolean,
  hasContent?: boolean,
): TimelineStep[] {
  const steps: TimelineStep[] = [];
  let reasoningBuf: string[] = [];
  let stepId = 0;

  function flushReasoning(isActive: boolean) {
    if (reasoningBuf.length === 0) return;
    steps.push({
      id: `thinking-${stepId++}`,
      type: 'thinking',
      reasoning: reasoningBuf.join('\n'),
      isActive,
    });
    reasoningBuf = [];
  }

  for (const part of parts) {
    if (!part || !part.type) continue;

    if (part.type === 'reasoning') {
      const text = part.reasoning || (part as any).text || '';
      if (text) reasoningBuf.push(text);
    } else if (part.type === 'text') {
      const { thinking } = extractThinkTagsFromText(part.text || '');
      if (thinking) reasoningBuf.push(thinking);
    } else if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
      const toolName = part.toolName || part.type.replace(/^tool-/, '');
      if (toolName === 'writeArtifact') continue;

      const isActivelyThinking = isStreaming && reasoningBuf.length > 0 && !hasContent;
      flushReasoning(isActivelyThinking);

      const state = part.state === 'output-available' ? 'result' : 'call';
      steps.push({
        id: part.toolCallId || `search-${stepId++}`,
        type: 'searching',
        query: part.input?.query || part.input?.url || '',
        isRunning: state !== 'result',
        sources: buildSourcesFromResult(part.output || part.result),
        isActive: state !== 'result',
      });
    }
  }

  flushReasoning(isStreaming && !hasContent);

  if (toolInvocations) {
    const existingIds = new Set(steps.map(s => s.id));
    for (const ti of toolInvocations) {
      if (ti.toolName === 'writeArtifact' || existingIds.has(ti.toolCallId)) continue;
      steps.push({
        id: ti.toolCallId || `search-${stepId++}`,
        type: 'searching',
        query: ti.args?.query || ti.args?.url || '',
        isRunning: ti.state !== 'result',
        sources: ti.state === 'result' ? buildSourcesFromResult(ti.result) : [],
        isActive: ti.state !== 'result',
      });
    }
  }

  return steps;
}

function buildStepsFallback(
  reasoning: string | undefined,
  toolInvocations: any[] | undefined,
  isStreaming: boolean,
  hasContent?: boolean,
): TimelineStep[] {
  const searchTools = (toolInvocations || []).filter(
    (ti) => ti.toolName !== 'writeArtifact',
  );

  const steps: TimelineStep[] = [];

  if (reasoning) {
    steps.push({
      id: 'thinking',
      type: 'thinking',
      reasoning,
      isActive: isStreaming && !hasContent,
    });
  }

  for (const ti of searchTools) {
    steps.push({
      id: ti.toolCallId || `search-${steps.length}`,
      type: 'searching',
      query: ti.args?.query || ti.args?.url || '',
      isRunning: ti.state !== 'result',
      sources: ti.state === 'result' ? buildSourcesFromResult(ti.result) : [],
      isActive: ti.state !== 'result',
    });
  }

  return steps;
}

export function useTimelineSteps(
  reasoning: string | undefined,
  toolInvocations: any[] | undefined,
  isStreaming: boolean,
  parts?: any[],
  hasContent?: boolean,
): TimelineStep[] {
  return useMemo(() => {
    const hasParts = parts && Array.isArray(parts) && parts.length > 0;
    return hasParts
      ? buildStepsFromParts(parts, toolInvocations, isStreaming, hasContent)
      : buildStepsFallback(reasoning, toolInvocations, isStreaming, hasContent);
  }, [reasoning, toolInvocations, isStreaming, parts, hasContent]);
}

// ── Hook to aggregate all sources from completed searches ──────────

export function useAggregatedSources(
  toolInvocations: any[] | undefined,
): TimelineSource[] {
  return useMemo(() => {
    const seen = new Set<string>();
    const sources: TimelineSource[] = [];

    const searchTools = (toolInvocations || []).filter(
      (ti) => ti.toolName !== 'writeArtifact' && ti.state === 'result' && ti.result?.results,
    );

    for (const ti of searchTools) {
      for (const r of ti.result.results) {
        if (r.url && !seen.has(r.url)) {
          seen.add(r.url);
          sources.push({ url: r.url, title: r.title || r.snippet || '', snippet: r.snippet });
        }
      }
    }

    return sources;
  }, [toolInvocations]);
}
