import React, { useMemo, useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  InternetIcon, Clock01Icon, CheckmarkCircle02Icon,
  FileSearchIcon, FilePlusIcon, PencilEdit02Icon,
  FolderOpenIcon, Search02Icon, FileCodeIcon,
  SearchCodeIcon, SourceCodeIcon, Folder01Icon,
  FileSpreadsheetIcon, GitBranchIcon, GitCommitIcon,
  GitPullRequestIcon, GitMergeIcon, FileValidationIcon,
  CommandLineIcon, ComputerIcon, Task01Icon,
  CursorTextIcon, GlobeIcon, WebSecurityIcon,
  FileDownloadIcon, AiImageIcon, AiBrowserIcon,
  Bug02Icon, AiBookIcon,
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
  type: 'thinking' | 'searching';
  reasoning?: string;
  query?: string;
  isRunning?: boolean;
  sources?: TimelineSource[];
  isActive: boolean;
  error?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
}

interface ThinkingTimelineProps {
  steps: TimelineStep[];
  isStreaming: boolean;
}

type DisplayType = 'expandable' | 'inline' | 'default';

interface ToolConfig {
  icon: typeof InternetIcon;
  presentPrefix: string;
  pastPrefix: string;
  displayType: DisplayType;
}

// ── Tool Configuration ─────────────────────────────────────────────

const TOOL_CONFIG: Record<string, ToolConfig> = {
  read_file:      { icon: FileSearchIcon, presentPrefix: 'Reading', pastPrefix: 'Read', displayType: 'expandable' },
  write_file:     { icon: FilePlusIcon, presentPrefix: 'Writing', pastPrefix: 'Wrote', displayType: 'expandable' },
  edit_file:      { icon: PencilEdit02Icon, presentPrefix: 'Editing', pastPrefix: 'Edited', displayType: 'expandable' },
  list_directory: { icon: FolderOpenIcon, presentPrefix: 'Listing', pastPrefix: 'Listed', displayType: 'expandable' },
  find_files:     { icon: Search02Icon, presentPrefix: 'Finding', pastPrefix: 'Found', displayType: 'expandable' },
  glob_files:     { icon: FileCodeIcon, presentPrefix: 'Globbing', pastPrefix: 'Globbed', displayType: 'expandable' },
  grep_files:     { icon: SearchCodeIcon, presentPrefix: 'Searching', pastPrefix: 'Searched', displayType: 'expandable' },
  code_search:    { icon: SourceCodeIcon, presentPrefix: 'Searching', pastPrefix: 'Searched', displayType: 'expandable' },
  file_stats:     { icon: Folder01Icon, presentPrefix: 'Checking', pastPrefix: 'Checked', displayType: 'expandable' },
  count_lines:    { icon: FileSpreadsheetIcon, presentPrefix: 'Counting', pastPrefix: 'Counted', displayType: 'expandable' },
  git_status:     { icon: GitBranchIcon, presentPrefix: 'Checking', pastPrefix: 'Checked', displayType: 'expandable' },
  git_diff:       { icon: GitCommitIcon, presentPrefix: 'Checking', pastPrefix: 'Checked', displayType: 'expandable' },
  git_log:        { icon: GitPullRequestIcon, presentPrefix: 'Checking', pastPrefix: 'Checked', displayType: 'expandable' },
  git_branches:   { icon: GitMergeIcon, presentPrefix: 'Listing', pastPrefix: 'Listed', displayType: 'expandable' },
  git_show:       { icon: FileValidationIcon, presentPrefix: 'Showing', pastPrefix: 'Showed', displayType: 'expandable' },
  run_command:    { icon: CommandLineIcon, presentPrefix: 'Running', pastPrefix: 'Ran', displayType: 'expandable' },
  system_info:    { icon: ComputerIcon, presentPrefix: 'Getting', pastPrefix: 'Got', displayType: 'expandable' },
  list_processes: { icon: Task01Icon, presentPrefix: 'Listing', pastPrefix: 'Listed', displayType: 'expandable' },
  resolve_path:   { icon: CursorTextIcon, presentPrefix: 'Resolving', pastPrefix: 'Resolved', displayType: 'expandable' },
  http_request:   { icon: GlobeIcon, presentPrefix: 'Making', pastPrefix: 'Made', displayType: 'expandable' },
  check_url:      { icon: WebSecurityIcon, presentPrefix: 'Checking', pastPrefix: 'Checked', displayType: 'expandable' },
  web_search:     { icon: InternetIcon, presentPrefix: 'Searching', pastPrefix: 'Searched', displayType: 'default' },
  fetch_page:     { icon: FileDownloadIcon, presentPrefix: 'Fetching', pastPrefix: 'Fetched', displayType: 'default' },
  image_search:   { icon: AiImageIcon, presentPrefix: 'Searching', pastPrefix: 'Searched', displayType: 'default' },
  news_search:    { icon: AiBrowserIcon, presentPrefix: 'Searching', pastPrefix: 'Searched', displayType: 'default' },
  subagent_run:   { icon: Bug02Icon, presentPrefix: 'Delegating', pastPrefix: 'Delegated', displayType: 'expandable' },
  search_docs:    { icon: AiBookIcon, presentPrefix: 'Searching', pastPrefix: 'Searched', displayType: 'expandable' },
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

function getInputSummary(toolName: string, input: any): string {
  if (!input) return '';
  switch (toolName) {
    case 'read_file': case 'write_file': case 'edit_file': case 'file_stats':
    case 'list_directory': case 'count_lines': case 'resolve_path':
      return input.path || '';
    case 'find_files': case 'glob_files':
      return input.pattern || input.path || '';
    case 'grep_files': case 'code_search': case 'search_docs':
      return input.pattern || input.query || input.path || '';
    case 'run_command':
      return input.command || '';
    case 'http_request': case 'check_url':
      return input.url || '';
    case 'subagent_run':
      return input.task || '';
    case 'git_diff':
      return `${input.path || ''}${input.cached ? ' (staged)' : ''}`;
    case 'git_show':
      return input.revision || input.path || '';
    case 'git_status': case 'git_log': case 'git_branches':
      return input.path || '';
    default:
      return input.query || input.url || input.path || '';
  }
}

function getResultCount(output: any): string {
  if (!output) return '';
  if (output.totalResults != null) return `${output.totalResults} results`;
  if (output.results && Array.isArray(output.results)) return `${output.results.length} results`;
  if (output.files && Array.isArray(output.files)) return `${output.files.length} matches`;
  if (output.paths && Array.isArray(output.paths)) return `${output.paths.length} matches`;
  if (output.matches && Array.isArray(output.matches)) return `${output.matches.length} matches`;
  if (output.entries && Array.isArray(output.entries)) return `${output.entries.length} items`;
  if (output.commits && Array.isArray(output.commits)) return `${output.commits.length} entries`;
  if (output.branches && Array.isArray(output.branches)) return `${output.branches.length} branches`;
  if (output.processes && Array.isArray(output.processes)) return `${output.processes.length} processes`;
  if (output.totalLines != null) return `${output.totalLines} lines`;
  if (output.total != null) return `${output.total} total`;
  const added = output.addedLines || output.additions || 0;
  const removed = output.removedLines || output.deletions || 0;
  if (added || removed) return `+${added}/-${removed}`;
  if (output.status) return `${output.status}`;
  return '';
}

function formatInlineResult(toolName: string, input: any, output: any): string {
  const summary = getInputSummary(toolName, input);
  const count = getResultCount(output);
  if (summary && count) return `${summary} → ${count}`;
  if (summary) return summary;
  if (count) return count;
  return '';
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
  if (toolName === 'http_request') {
    const parts: string[] = [];
    if (output.status != null) parts.push(`Status: ${output.status} ${output.statusText || ''}`);
    if (output.data != null) {
      const data = typeof output.data === 'object' ? JSON.stringify(output.data, null, 2) : String(output.data);
      parts.push(`Body:\n${data.slice(0, 3000)}${data.length > 3000 ? '...' : ''}`);
    }
    return parts.join('\n') || JSON.stringify(output, null, 2);
  }
  if (toolName === 'subagent_run') {
    return output.result || output.summary || output.output || JSON.stringify(output, null, 2);
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
          <ReactMarkdown
            remarkPlugins={REMARK_PLUGINS}
            components={{
              code({ inline, className, children, ...props }: any) {
                if (inline) {
                  return <code {...props}>{children}</code>;
                }
                return <code className={className} {...props}>{children}</code>;
              },
            }}
          >
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

function SearchingStepContent({ step }: {
  step: TimelineStep;
}) {
  const isRunning = !!step.isRunning;
  const isError = !isRunning && step.sources && step.sources.length === 0 && !!step.error;
  const sources = step.sources || [];
  const query = step.query || '';
  const timer = useSearchTimer(isRunning);

  let timerLabel = '';
  if (timer > 0) {
    timerLabel = formatDuration(timer);
  }

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
        <div className="w-full rounded-[8px] border border-border bg-muted/30 p-2 max-h-[135px] overflow-y-auto thin-scrollbar">
          {sources.length === 0 && isRunning ? (
            <div className="flex items-center gap-2 min-h-[24px]">
              <span className="text-[11px] text-muted-foreground/50 italic">Gathering sources...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {sources.map((src, sIdx) => (
                <a
                  key={sIdx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 pl-0.5 pr-1 py-0.5 rounded-[4px] hover:bg-foreground/10 active:bg-foreground/20 transition-colors no-underline text-[11px] text-foreground/80 w-full"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${getDomain(src.url)}&sz=16`}
                    alt=""
                    width={14}
                    height={14}
                    className="rounded-full shrink-0"
                  />
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

function InlineToolContent({ step }: {
  step: TimelineStep;
}) {
  const config = step.toolName ? TOOL_CONFIG[step.toolName] : null;
  const isRunning = !!step.isRunning;
  const prefix = isRunning ? config?.presentPrefix : config?.pastPrefix;
  const result = formatInlineResult(step.toolName || '', step.toolInput, step.toolOutput);

  return (
    <div className="flex flex-col gap-1">
      <span className={`text-xs font-medium font-inter truncate ${isRunning ? 'thinking-shimmer-text' : 'text-muted-foreground'}`}>
        {prefix}{result ? ` — ${result}` : ''}
      </span>
    </div>
  );
}

function ExpandableToolContent({ step }: {
  step: TimelineStep;
}) {
  const config = step.toolName ? TOOL_CONFIG[step.toolName] : null;
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = !!step.isRunning;
  const done = !isRunning;
  const prefix = isRunning ? config?.presentPrefix : config?.pastPrefix;
  const summary = getInputSummary(step.toolName || '', step.toolInput);
  const count = getResultCount(step.toolOutput);

  const label = prefix + (summary ? ` — ${summary}` : '') + (count ? ` → ${count}` : '');

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setIsExpanded(p => !p)}
        className="flex items-center gap-1.5 text-left w-full"
      >
        <span className={`text-xs font-medium font-inter truncate ${isRunning ? 'thinking-shimmer-text' : 'text-muted-foreground'}`}>
          {label}
        </span>
        {done && <span className="text-[10px] text-muted-foreground/60 shrink-0">{isExpanded ? '▾' : '▸'}</span>}
      </button>

      <div className={`grid transition-all duration-200 ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden min-h-0">
          <div className="rounded-[8px] border border-border bg-muted/30 p-2 mt-1 max-h-[250px] overflow-y-auto thin-scrollbar">
            {step.toolInput && (
              <div className="mb-2">
                <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">Input</div>
                <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-words">
                  {JSON.stringify(step.toolInput, null, 2)}
                </pre>
              </div>
            )}
            {step.toolOutput && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">Output</div>
                <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-words max-h-[150px] overflow-y-auto">
                  {formatToolOutput(step.toolName || '', step.toolOutput)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
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
              {!isThinking && config?.displayType === 'expandable' && (
                <ExpandableToolContent step={step} />
              )}
              {!isThinking && config?.displayType === 'inline' && (
                <InlineToolContent step={step} />
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
      steps.push({
        id: part.toolCallId || `search-${stepId++}`,
        type: 'searching',
        query: part.input?.query || part.input?.url || '',
        isRunning: !isToolDone,
        sources: buildSourcesFromResult(part.output || part.result),
        isActive: !isToolDone,
        toolName,
        toolInput: part.input,
        toolOutput: part.output || part.result,
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
      steps.push({
        id: ti.toolCallId || `search-${stepId++}`,
        type: 'searching',
        query: ti.args?.query || ti.args?.url || '',
        isRunning: !isDone,
        sources: isDone ? buildSourcesFromResult(ti.result) : [],
        isActive: !isDone,
        toolName: ti.toolName,
        toolInput: ti.args,
        toolOutput: isDone ? ti.result : undefined,
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
    steps.push({
      id: ti.toolCallId || `search-${steps.length}`,
      type: 'searching',
      query: ti.args?.query || ti.args?.url || '',
      isRunning: !isDone,
      sources: isDone ? buildSourcesFromResult(ti.result) : [],
      isActive: !isDone,
      toolName: ti.toolName,
      toolInput: ti.args,
      toolOutput: isDone ? ti.result : undefined,
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
