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
        isRunning ? 'bg-blue-50 active:bg-blue-100' : 'hover:bg-neutral-50 active:bg-neutral-100'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-center w-5 h-5 shrink-0">
        <HugeiconsIcon
          icon={InternetIcon}
          size={12}
          className={isRunning ? 'text-blue-500' : 'text-neutral-400'}
        />
      </div>
      <span
        className={
          isRunning
            ? 'thinking-shimmer-text text-sm font-medium'
            : 'text-sm font-medium text-neutral-500'
        }
      >
        Searching
      </span>
      {query && (
        <span className="text-sm font-medium text-neutral-600 truncate max-w-[400px]">
          &ldquo;{query}&rdquo;
        </span>
      )}
      <HugeiconsIcon
        icon={ChevronsDownUpIcon}
        size={12}
        className="text-neutral-400 ml-auto opacity-0 group-hover/searchheader:opacity-100 transition-opacity cursor-pointer"
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

/**
 * ThinkingTimeline
 *
 * Renders the vertical timeline of think/search steps that appears INSIDE
 * the expandable reasoning panel. Each step has a left gutter (icon + connecting
 * line) and right content (reasoning text / search query + sources).
 *
 * The expand/collapse of the outer panel is controlled by the parent
 * (AssistantBubble) — this component is always visible content within it.
 */
export const ThinkingTimeline = React.memo(function ThinkingTimeline({
  steps,
  isStreaming,
}: ThinkingTimelineProps) {
  const [expandedSearch, setExpandedSearch] = useState<Set<string>>(new Set());

  const hasAnyStep = steps.length > 0;

  if (!hasAnyStep) return null;

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step) => {
        if (step.type === 'thinking') {
          const showEllipsis = step.isActive && isStreaming;

          return (
            <div key={step.id} className="flex">
              {/* Reasoning text */}
              <div className="flex flex-col gap-1 flex-1 min-w-0 pb-3">
                <div className="text-[14px] leading-relaxed text-neutral-500 [&>p]:my-0">
                  <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>
                    {step.reasoning || ''}
                  </ReactMarkdown>
                </div>
                {showEllipsis && (
                  <div className="text-[13px] leading-relaxed text-neutral-400 animate-pulse">
                    ...
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (step.type === 'searching') {
          const toggleExpand = () => {
            setExpandedSearch((prev) => {
              const next = new Set(prev);
              if (next.has(step.id)) {
                next.delete(step.id);
              } else {
                next.add(step.id);
              }
              return next;
            });
          };

          const isExpanded = expandedSearch.has(step.id);
          const sources = step.sources || [];

          return (
            <div key={step.id} className="pb-3">
              <SearchingHeader query={step.query || ''} isRunning={!!step.isRunning} onToggle={toggleExpand} />

                {/* Running indicator */}
                {step.isRunning && (
                  <div className="flex items-center gap-1.5 px-2 text-xs text-neutral-400 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    Fetching results...
                  </div>
                )}

                {/* Sources box - toggled by clicking the header */}
                {!step.isRunning && sources.length > 0 && (
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden min-h-0">
                      <div className="border border-neutral-200 rounded-[6px] overflow-y-auto max-h-[240px] thin-scrollbar mx-[5px]">
                        {sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-2 h-[36px] rounded-[6px] hover:bg-neutral-100 transition-colors no-underline"
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${getDomain(src.url)}&sz=16`}
                              alt=""
                              width={16}
                              height={16}
                              className="rounded shrink-0"
                            />
                            <span className="text-sm text-neutral-700 truncate">{src.title || src.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
});

// ── Hook to build timeline steps from raw props ────────────────────

/**
 * Derives a chronologically-ordered array of TimelineSteps from the
 * `parts` array (preserves order of reasoning/tool phases).
 *
 * Each reasoning part → separate "thinking" step (each gets its own
 * timeline position, not all lumped into one).
 * Each dynamic-tool part → separate "searching" step.
 *
 * Falls back to flat reasoning+tools when parts aren't available
 * (e.g. saved messages from older versions).
 */
export function useTimelineSteps(
  reasoning: string | undefined,
  toolInvocations: any[] | undefined,
  isStreaming: boolean,
  parts?: any[],
  hasContent?: boolean,
): TimelineStep[] {
  return useMemo(() => {
    const steps: TimelineStep[] = [];

    // ── Build from parts (preserves chronological order) ──
    if (parts && Array.isArray(parts) && parts.length > 0) {
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

      const pendingTools = new Map<string, boolean>();
      for (const ti of toolInvocations || []) {
        if (ti.toolName !== 'writeArtifact') {
          pendingTools.set(ti.toolCallId, ti.state !== 'result');
        }
      }

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part || !part.type) continue;

        if (part.type === 'reasoning') {
          const text = part.reasoning || (part as any).text || '';
          if (text) reasoningBuf.push(text);
        } else if (part.type === 'dynamic-tool' || (part.type && part.type.startsWith('tool-'))) {
          const toolName = part.toolName || part.type.replace(/^tool-/, '');
          if (toolName === 'writeArtifact') continue;

          // Flush accumulated reasoning as a thinking step
          const isActivelyThinking = isStreaming && reasoningBuf.length > 0 && !hasContent;
          flushReasoning(isActivelyThinking);

          // Build sources from result
          const sources: TimelineSource[] = [];
          const output = part.output || part.result;
          if (output?.results) {
            for (const r of output.results) {
              if (r.url) {
                sources.push({ url: r.url, title: r.title || r.snippet || '', snippet: r.snippet });
              }
            }
          }

          const state = part.state === 'output-available' ? 'result' : 'call';
          const query = part.input?.query || part.input?.url || '';
          steps.push({
            id: part.toolCallId || `search-${stepId++}`,
            type: 'searching',
            query,
            isRunning: state !== 'result',
            sources,
            isActive: state !== 'result',
          });
        }
      }

      // Flush any remaining reasoning as a final thinking step
      flushReasoning(isStreaming && !hasContent);

      // Also check toolInvocations for search tools that don't have
      // corresponding parts (e.g. completed results that arrived after parts)
      if (toolInvocations) {
        const existingIds = new Set(steps.map(s => s.id));
        for (const ti of toolInvocations) {
          if (ti.toolName === 'writeArtifact') continue;
          if (existingIds.has(ti.toolCallId)) continue;
          const sources: TimelineSource[] = [];
          if (ti.state === 'result' && ti.result?.results) {
            for (const r of ti.result.results) {
              if (r.url) sources.push({ url: r.url, title: r.title || r.snippet || '', snippet: r.snippet });
            }
          }
          steps.push({
            id: ti.toolCallId || `search-${stepId++}`,
            type: 'searching',
            query: ti.args?.query || ti.args?.url || '',
            isRunning: ti.state !== 'result',
            sources,
            isActive: ti.state !== 'result',
          });
        }
      }

      return steps;
    }

    // ── Fallback: flat reasoning + tools (no parts available) ──
    const searchTools = (toolInvocations || []).filter(
      (ti) => ti.toolName !== 'writeArtifact',
    );
    const hasReasoning = !!reasoning;
    const hasSearchTools = searchTools.length > 0;

    if (!hasReasoning && !hasSearchTools) {
      return steps;
    }

    if (hasReasoning) {
      steps.push({
        id: 'thinking',
        type: 'thinking',
        reasoning,
        isActive: isStreaming && !hasContent,
      });
    }

    searchTools.forEach((ti) => {
      const sources: TimelineSource[] = [];
      if (ti.state === 'result' && ti.result?.results) {
        for (const r of ti.result.results) {
          if (r.url) sources.push({ url: r.url, title: r.title || r.snippet || '', snippet: r.snippet });
        }
      }
      steps.push({
        id: ti.toolCallId || `search-${steps.length}`,
        type: 'searching',
        query: ti.args?.query || ti.args?.url || '',
        isRunning: ti.state !== 'result',
        sources,
        isActive: ti.state !== 'result',
      });
    });

    return steps;
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
