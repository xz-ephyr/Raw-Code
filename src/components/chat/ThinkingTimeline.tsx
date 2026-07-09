import React, { useMemo, useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  InternetIcon,   Clock01Icon, CheckmarkCircle02Icon,
  Scroll01Icon, FilePlusIcon, PencilEdit02Icon,
  SearchList01Icon, FileCodeIcon,
  SearchCodeIcon, CommandLineIcon,
  DiscoverSquareIcon,
} from '@hugeicons/core-free-icons';
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
  type: 'thinking' | 'searching' | 'exploring';
  reasoning?: string;
  query?: string;
  isRunning?: boolean;
  sources?: TimelineSource[];
  isActive: boolean;
  error?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;

  // New fields for redesigned UI
  inlineSummary?: string;
  scriptLine?: string;
  filePath?: string;
  linesAdded?: number;
  linesRemoved?: number;
  readOffset?: number;
  readLimit?: number;
  toolCount?: number;
  wallClockMs?: number;
}

interface ThinkingTimelineProps {
  steps: TimelineStep[];
  isStreaming: boolean;
}

type DisplayType = 'inline' | 'default';

interface ToolConfig {
  icon: typeof InternetIcon;
  presentPrefix: string;
  pastPrefix: string;
  displayType: DisplayType;
}

// ── Tool Configuration ─────────────────────────────────────────────

const TOOL_CONFIG: Record<string, ToolConfig> = {
  read_file:       { icon: Scroll01Icon, presentPrefix: 'Reading', pastPrefix: 'Read', displayType: 'inline' },
  write_file:      { icon: FilePlusIcon, presentPrefix: 'Writing', pastPrefix: 'Wrote', displayType: 'inline' },
  edit_file:       { icon: PencilEdit02Icon, presentPrefix: 'Editing', pastPrefix: 'Edited', displayType: 'inline' },
  list_directory:  { icon: SearchList01Icon, presentPrefix: 'Listing', pastPrefix: 'Listed', displayType: 'inline' },
  search_codebase: { icon: SearchCodeIcon, presentPrefix: 'Grepping', pastPrefix: 'Grepped', displayType: 'inline' },
  run_command:     { icon: CommandLineIcon, presentPrefix: 'Running', pastPrefix: 'Ran', displayType: 'inline' },
  web_search:      { icon: InternetIcon, presentPrefix: 'Searching', pastPrefix: 'Searched', displayType: 'default' },
  write_artifact:  { icon: FileCodeIcon, presentPrefix: 'Writing', pastPrefix: 'Wrote', displayType: 'inline' },
  subagent_run:    { icon: DiscoverSquareIcon, presentPrefix: 'Delegating', pastPrefix: 'Delegated', displayType: 'inline' },
};

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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function shortenPath(fullPath: string): string {
  if (!fullPath) return '';
  const segments = fullPath.split(/[\\\/]/).filter(Boolean);
  const knownSkip = new Set(['C:', 'D:', 'Users', 'zephy', 'Documents']);
  let startIdx = 0;
  for (let i = 0; i < segments.length; i++) {
    if (!knownSkip.has(segments[i])) {
      startIdx = i;
      break;
    }
  }
  const projectRoot = segments[startIdx];
  const rest = segments.slice(startIdx + 1);
  const sep = fullPath.includes('\\') ? '\\' : '/';
  return `~${projectRoot}${rest.length > 0 ? sep + rest.join(sep) : ''}`;
}

function extractInlineInfo(toolName: string, input: any, output: any): {
  inlineSummary: string;
  scriptLine?: string;
  filePath?: string;
  linesAdded?: number;
  linesRemoved?: number;
  readOffset?: number;
  readLimit?: number;
} {
  if (!input) return { inlineSummary: '' };
  switch (toolName) {
    case 'run_command': {
      const cmd = input.command || '';
      return { inlineSummary: cmd.slice(0, 80), scriptLine: cmd };
    }
    case 'read_file': {
      const path = input.path || '';
      const offset = input.offset;
      const limit = input.limit;
      const short = shortenPath(path);
      const summary = offset != null ? `${short} (offset=${offset}, limit=${limit ?? 'full'})` : short;
      return { inlineSummary: summary, filePath: short, readOffset: offset, readLimit: limit };
    }
    case 'write_file':
    case 'edit_file': {
      const path = input.path || '';
      const oldContent = output?.oldContent || '';
      const newContent = output?.content || input?.content || '';
      const added = Math.max(0, newContent.split('\n').length - oldContent.split('\n').length);
      const removed = Math.max(0, oldContent.split('\n').length - newContent.split('\n').length);
      const short = shortenPath(path);
      return { inlineSummary: `${short}  +${added} / -${removed}`, filePath: short, linesAdded: added, linesRemoved: removed };
    }
    case 'search_codebase': {
      return { inlineSummary: input.query || input.pattern || input.path || '' };
    }
    case 'list_directory': {
      const path = input.path || '';
      return { inlineSummary: shortenPath(path) };
    }
    default:
      return { inlineSummary: '' };
  }
}

function formatToolOutput(toolName: string, output: any): string {
  if (!output) return '';
  if (toolName === 'read_file') {
    return output.content || output.text || JSON.stringify(output, null, 2);
  }
  if (toolName === 'write_file' || toolName === 'edit_file') {
    return output.message || output.result || JSON.stringify(output, null, 2);
  }
  if (toolName === 'run_command') {
    const parts: string[] = [];
    if (output.stdout) parts.push(`stdout:\n${output.stdout}`);
    if (output.stderr) parts.push(`stderr:\n${output.stderr}`);
    if (output.exitCode != null) parts.push(`exit code: ${output.exitCode}`);
    return parts.join('\n\n') || JSON.stringify(output, null, 2);
  }
  if (toolName === 'subagent_run') {
    return output.result || output.summary || output.output || JSON.stringify(output, null, 2);
  }
  if (toolName === 'list_directory') {
    if (output.entries && Array.isArray(output.entries)) {
      return output.entries.map((e: any) => `${e.name}${e.isDir ? '/' : ''}`).join('\n');
    }
    if (output.files && Array.isArray(output.files)) {
      return output.files.join('\n');
    }
    if (output.paths && Array.isArray(output.paths)) {
      return output.paths.map((p: string) => shortenPath(p)).join('\n');
    }
    return JSON.stringify(output, null, 2);
  }
  return JSON.stringify(output, null, 2);
}

// ── Hooks ──────────────────────────────────────────────────────────

function useSearchTimer(isRunning: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (isRunning) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        setElapsed(0);
      }
      const id = setInterval(() => {
        if (startTimeRef.current !== null) {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 200);
      return () => clearInterval(id);
    } else {
      startTimeRef.current = null;
    }
  }, [isRunning]);
  return elapsed;
}

// ── Sub-components ─────────────────────────────────────────────────

function ThinkingStepContent({ reasoning, isActive, isStreaming }: {
  reasoning?: string;
  isActive: boolean;
  isStreaming: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (contentRef.current && reasoning && reasoning.length > prevLengthRef.current) {
      prevLengthRef.current = reasoning.length;
    }
  }, [reasoning]);

  const showEllipsis = isActive && isStreaming;
  return (
    <div className="flex flex-col gap-1">
      {reasoning && (
        <div ref={contentRef} className="text-[12px] leading-relaxed text-foreground/90 [&>p]:my-0 font-inter">
          <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={{
            code({ inline, className, children, ...props }: any) {
              if (inline) return <code {...props}>{children}</code>;
              return <code className={className} {...props}>{children}</code>;
            },
          }}>
            {reasoning}
          </ReactMarkdown>
        </div>
      )}
      {showEllipsis && (
        <div className="text-[13px] leading-relaxed text-muted-foreground animate-pulse">...</div>
      )}
    </div>
  );
}

function SearchingStepContent({ step }: { step: TimelineStep }) {
  const isRunning = !!step.isRunning;
  const isError = !isRunning && step.sources && step.sources.length === 0 && !!step.error;
  const sources = step.sources || [];
  const query = step.query || '';
  const timer = useSearchTimer(isRunning);
  let timerLabel = '';
  if (timer > 0) timerLabel = formatDuration(timer);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {isError ? (
          <span className="text-xs font-medium text-red-500 font-inter truncate">
            {query ? `Search failed — ${query}` : 'Search failed'}
          </span>
        ) : isRunning ? (
          <span className="thinking-shimmer-text text-xs font-medium font-inter truncate">
            {query ? `Searching — ${query}` : 'Searching'}
            {timerLabel && <span className="text-muted-foreground ml-1">· {timerLabel}</span>}
          </span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground font-inter">
            Searched{query ? ` — ${query}` : ''}
            {timerLabel && <span className="text-muted-foreground ml-1">· {timerLabel}</span>}
          </span>
        )}
      </div>
      {isError && (
        <div className="text-xs text-red-400 font-inter">{(step as any).error || 'An error occurred during search.'}</div>
      )}
      {!isError && (isRunning || sources.length > 0) && (
        <div className="w-full rounded-[8px] border border-border/30 bg-muted/30 p-2 max-h-[135px] overflow-y-auto thin-scrollbar">
          {sources.length === 0 && isRunning ? (
            <div className="flex items-center gap-2 min-h-[24px]">
              <span className="text-[11px] text-muted-foreground/50 italic">Gathering sources...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {sources.map((src, sIdx) => (
                <a key={sIdx} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 pl-0.5 pr-1 py-0.5 rounded-[4px] hover:bg-foreground/10 active:bg-foreground/20 transition-colors no-underline text-[11px] text-foreground/80 w-full"
                >
                  <img src={`https://www.google.com/s2/favicons?domain=${getDomain(src.url)}&sz=16`} alt="" width={14} height={14} className="rounded-full shrink-0" />
                  <span className="truncate min-w-0">{src.title || getDomain(src.url)}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tool inline box (clickable detail panel) ───────────────────────

function ToolInlineBox({ step }: { step: TimelineStep }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = step.toolName ? TOOL_CONFIG[step.toolName] : null;
  if (!config || config.displayType === 'default') return null;

  const hasInput = step.toolInput && Object.keys(step.toolInput).length > 0;
  const hasOutput = step.toolOutput != null && step.toolOutput !== '';
  if (!hasInput && !hasOutput) return null;

  const formattedOutput = formatToolOutput(step.toolName || '', step.toolOutput);

  return (
    <div className="mt-0.5">
      {/* Inline summary line (clickable) — wrapped in inline bg */}
      <div
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer text-[11px] font-mono text-muted-foreground/80 max-w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        {step.toolName === 'run_command' && step.scriptLine && (
          <span className="truncate">script  {step.scriptLine}</span>
        )}
        {(step.toolName === 'read_file' || step.toolName === 'write_file' || step.toolName === 'edit_file' || step.toolName === 'list_directory') && step.filePath && (
          <span className="truncate">
            {step.filePath}
            {step.readOffset != null && <span className="text-muted-foreground/50 ml-1">offset={step.readOffset}</span>}
            {step.readLimit != null && <span className="text-muted-foreground/50 ml-1">limit={step.readLimit}</span>}
            {step.linesAdded != null && <span className="text-muted-foreground/50 ml-1">+{step.linesAdded} / -{step.linesRemoved}</span>}
          </span>
        )}
        {step.toolName === 'search_codebase' && step.inlineSummary && (
          <span className="truncate">{step.inlineSummary}</span>
        )}
      </div>

      {/* Expanded detail panel */}
      <div className={`grid transition-all ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden min-h-0">
          <div className="mt-1.5 rounded-lg border border-border/30 bg-muted/50 overflow-hidden">
            {step.toolName === 'run_command' && (
              <div className="flex flex-col">
                <div className="bg-card/80 px-3 py-2 font-mono text-xs text-foreground border-b border-border/20">
                  {step.scriptLine}
                </div>
                {hasOutput && (
                  <div className="px-3 py-2 font-mono text-xs text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {formattedOutput}
                  </div>
                )}
              </div>
            )}
            {(step.toolName === 'read_file' || step.toolName === 'write_file' || step.toolName === 'edit_file') && hasOutput && (
              <div className="px-3 py-2 font-mono text-xs text-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                {formattedOutput}
              </div>
            )}
            {(step.toolName === 'search_codebase' || step.toolName === 'list_directory') && hasOutput && (
              <div className="px-3 py-2 font-mono text-xs text-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                {formattedOutput}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Explorer Agent Block ───────────────────────────────────────────

function ExplorerAgentBlock({ step }: { step: TimelineStep }) {
  const output = step.toolOutput;
  const subSteps = (output?.steps || output?.toolCalls || []) as any[];
  const toolCount = step.toolCount ?? subSteps.length;
  const wallClockMs = step.wallClockMs ?? output?.durationMs ?? 0;

  return (
    <div className="flex flex-col gap-1">
      {/* Header — only part that shimmers */}
      <div className={`flex items-center gap-2 text-xs ${step.isRunning ? 'thinking-shimmer-text' : ''}`}>
        <span className="text-foreground font-medium">Explore Task</span>
        <span className="text-muted-foreground/40"> — </span>
        <span className="text-muted-foreground">
          {step.inlineSummary || 'Understanding project structure...'}
        </span>
      </div>

      {/* Tool calls below header — one at a time, replacing each other */}
      {step.isRunning && subSteps.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1">
          {subSteps.slice(-3).map((s: any, i: number) => (
            <div key={i} className="text-[11px] font-mono text-muted-foreground/60">
              {s.toolName}: {(s.toolInput || s.params)?.path || (s.toolInput || s.params)?.query || (s.toolInput || s.params)?.pattern || (s.toolInput || s.params)?.command || ''}
            </div>
          ))}
        </div>
      )}

      {/* When done: show summary */}
      {!step.isRunning && toolCount > 0 && (
        <div className="text-[11px] text-muted-foreground/60 mt-1">
          {toolCount} tool calls in {formatDuration(Math.floor(wallClockMs / 1000))}
        </div>
      )}
    </div>
  );
}

// ── Tool row: icon + prefix + summary (no expandable click) ────────

function ToolRow({ step, isStreaming }: { step: TimelineStep; isStreaming: boolean }) {
  const config = step.toolName ? TOOL_CONFIG[step.toolName] : null;
  const isRunning = !!step.isRunning;
  const prefix = isRunning ? config?.presentPrefix : config?.pastPrefix;
  const showShimmer = isRunning && isStreaming;
  const isExplorer = step.toolName === 'subagent_run' && step.type === 'exploring';

  // Quick inline for explorer — render as explorer block
  if (isExplorer) {
    return (
      <div className="flex flex-col gap-1">
        <ExplorerAgentBlock step={step} />
      </div>
    );
  }

  const summary = step.inlineSummary || '';
  const label = prefix + (summary ? ` — ${summary}` : '');

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-2 text-xs ${showShimmer ? 'thinking-shimmer-text' : ''}`}>
        <span className={`text-xs font-medium font-inter truncate ${isRunning ? '' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>
      {/* Inline detail box (not for web_search/default type) */}
      {config?.displayType !== 'default' && !showShimmer && (
        <ToolInlineBox step={step} />
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export const ThinkingTimeline = React.memo(function ThinkingTimeline({
  steps,
  isStreaming,
}: ThinkingTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isThinking = step.type === 'thinking';

        const config = step.toolName ? TOOL_CONFIG[step.toolName] : null;

        const done = isThinking
          ? !step.isActive && !isStreaming && !!step.reasoning
          : config
            ? !step.isRunning && !!step.toolOutput
            : !step.isRunning && (step.sources?.length || 0) > 0;

        const hasStarted = isThinking
          ? !!step.reasoning
          : step.isRunning || !!step.toolOutput || !!step.toolInput || (step.sources?.length || 0) > 0;

        return (
          <div key={step.id} className="flex gap-1.5">
            {/* Icon column */}
            <div className="flex flex-col items-center shrink-0 w-4">
              {isThinking && (
                <div className="text-muted-foreground">
                  <HugeiconsIcon icon={Clock01Icon} size={16} />
                </div>
              )}
              {!isThinking && (
                <div className="text-muted-foreground">
                  <HugeiconsIcon icon={config?.icon || InternetIcon} size={16} />
                </div>
              )}
              {(!isLast || hasStarted) && <div className="w-px flex-1 bg-border mt-0.5" />}
              {isLast && done && (
                <div className="text-muted-foreground mt-0.5">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                </div>
              )}
            </div>

            {/* Text column */}
            <div className="min-w-0 flex-1">
              {isThinking && (
                <ThinkingStepContent
                  reasoning={step.reasoning}
                  isActive={step.isActive}
                  isStreaming={isStreaming}
                />
              )}
              {!isThinking && config?.displayType === 'inline' && (
                <ToolRow step={step} isStreaming={isStreaming} />
              )}
              {!isThinking && (!config || config.displayType === 'default') && (
                <SearchingStepContent step={step} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ── Hook to build timeline steps from raw props ────────────────────

function extractThinkTagsFromText(text: string): { clean: string; thinking: string } {
  const thinkingParts: string[] = [];
  let clean = text;
  const regex = /<think>([\s\S]*?)<\/think>/gi;
  let match: RegExpExecArray | null;
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

function isExplorerToolCall(ti: any): boolean {
  return ti.toolName === 'subagent_run' && (
    ti.args?.agentType === 'explorer' ||
    (ti.args?.task && typeof ti.args.task === 'string' && ti.args.task.toLowerCase().includes('explore'))
  );
}

function buildStepsFromParts(
  parts: any[],
  toolInvocations: any[] | undefined,
  isStreaming: boolean,
  hasContent?: boolean,
): TimelineStep[] {
  const steps: TimelineStep[] = [];
  let stepId = 0;
  let lastThinkingIdx = -1;

  for (const part of parts) {
    if (!part || !part.type) continue;

    if (part.type === 'reasoning') {
      const text = part.reasoning || (part as any).text || '';
      if (text) {
        steps.push({
          id: `thinking-${stepId++}`,
          type: 'thinking',
          reasoning: text,
          isActive: false,
        });
        lastThinkingIdx = steps.length - 1;
      }
    } else if (part.type === 'text') {
      const { thinking } = extractThinkTagsFromText(part.text || '');
      if (thinking) {
        steps.push({
          id: `thinking-${stepId++}`,
          type: 'thinking',
          reasoning: thinking,
          isActive: false,
        });
        lastThinkingIdx = steps.length - 1;
      }
    } else if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
      const toolName = part.toolName || part.type.replace(/^tool-/, '');
      if (toolName === 'writeArtifact') continue;

      lastThinkingIdx = -1;
      const hasOutput = !!(part.output || part.result);
      const isToolDone = hasOutput || part.state === 'output-available' || part.state === 'result' || part.state === 'complete';
      const info = extractInlineInfo(toolName, part.input, part.output || part.result);

      const isExplorer = toolName === 'subagent_run' && (
        part.input?.agentType === 'explorer' ||
        (part.input?.task && typeof part.input.task === 'string' && part.input.task.toLowerCase().includes('explore'))
      );

      steps.push({
        id: part.toolCallId || `search-${stepId++}`,
        type: isExplorer ? 'exploring' : 'searching',
        query: part.input?.query || part.input?.url || '',
        isRunning: !isToolDone,
        sources: buildSourcesFromResult(part.output || part.result),
        isActive: !isToolDone,
        toolName,
        toolInput: part.input,
        toolOutput: part.output || part.result,
        ...info,
        toolCount: isExplorer ? (part.output?.steps || part.output?.toolCalls || []).length : undefined,
        wallClockMs: isExplorer ? (part.output?.durationMs || 0) : undefined,
      });
    }
  }

  if (isStreaming && !hasContent && lastThinkingIdx >= 0) {
    steps[lastThinkingIdx].isActive = true;
  }

  if (toolInvocations) {
    const existingIds = new Set(steps.map(s => s.id));
    for (const ti of toolInvocations) {
      if (ti.toolName === 'writeArtifact' || existingIds.has(ti.toolCallId)) continue;
      const isDone = ti.state === 'result' || !!ti.result;
      const info = extractInlineInfo(ti.toolName, ti.args, ti.result);
      const isExplorer = isExplorerToolCall(ti);
      steps.push({
        id: ti.toolCallId || `search-${stepId++}`,
        type: isExplorer ? 'exploring' : 'searching',
        query: ti.args?.query || ti.args?.url || '',
        isRunning: !isDone,
        sources: isDone ? buildSourcesFromResult(ti.result) : [],
        isActive: !isDone,
        toolName: ti.toolName,
        toolInput: ti.args,
        toolOutput: isDone ? ti.result : undefined,
        ...info,
        toolCount: isExplorer ? (ti.result?.steps || ti.result?.toolCalls || []).length : undefined,
        wallClockMs: isExplorer ? (ti.result?.durationMs || 0) : undefined,
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
    const isDone = ti.state === 'result' || !!ti.result;
    const info = extractInlineInfo(ti.toolName, ti.args, ti.result);
    const isExplorer = isExplorerToolCall(ti);
    steps.push({
      id: ti.toolCallId || `search-${steps.length}`,
      type: isExplorer ? 'exploring' : 'searching',
      query: ti.args?.query || ti.args?.url || '',
      isRunning: !isDone,
      sources: isDone ? buildSourcesFromResult(ti.result) : [],
      isActive: !isDone,
      toolName: ti.toolName,
      toolInput: ti.args,
      toolOutput: isDone ? ti.result : undefined,
      ...info,
      toolCount: isExplorer ? (ti.result?.steps || ti.result?.toolCalls || []).length : undefined,
      wallClockMs: isExplorer ? (ti.result?.durationMs || 0) : undefined,
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
