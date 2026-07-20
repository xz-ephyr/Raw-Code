import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SearchIcon, CheckIcon } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import { FilePreviewCard } from './FilePreviewCard';
import { useWriteArtifactStream } from '@/hooks/useWriteArtifactStream';
import { BubbleActions } from './BubbleActions';
import { MarkdownErrorBoundary } from './MarkdownErrorBoundary';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Streamdown } from 'streamdown';
import {
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from '@/components/ai/chain-of-thought';
import {
  ActionTimeline,
  type ActionItem,
} from '@/components/ai/action-summary';

interface AssistantBubbleProps {
  content: string;
  isStreaming: boolean;
  isThinkingEnabled?: boolean;
  model?: string;
  completionDuration?: number;
  version?: number;
  toolInvocations?: any[];
  reasoning?: string;
  parts?: any[];
  files?: any[];
  contentBeforeTool?: string;
  contentAfterTool?: string;
  actionSummary?: { summary: string; actions: ActionItem[] } | null;
  onOpenFile?: (file: any) => void;
  onCopy: () => void;
}

function extractFileSummary(content: string): string {
  if (!content) return '';
  const cleaned = content.replace(/^#+\s*/gm, '').trim();
  const paragraphs = cleaned.split(/\n\n+/);
  const firstPara = paragraphs[0] || '';
  return firstPara.length > 350 ? firstPara.slice(0, 347) + '...' : firstPara;
}

const ARTIFACT_TOOL_NAMES = new Set([
  'write_artifact',
]);

const SEARCH_TOOL_NAMES = new Set(['web_search', 'crawl_website']);
const RESEARCH_TOOL_NAMES = SEARCH_TOOL_NAMES;

export const AssistantBubble = React.memo(
  ({
    content,
    isStreaming,
    isThinkingEnabled,
    model,
    version,
    completionDuration,
    toolInvocations,
    files,
    contentBeforeTool,
    contentAfterTool,
    reasoning,
    actionSummary,
    onOpenFile,
    onCopy,
  }: AssistantBubbleProps) => {
    const hasWriteArtifact = toolInvocations?.some((ti) => ARTIFACT_TOOL_NAMES.has(ti.toolName));
    const artifactCall = hasWriteArtifact
      ? toolInvocations?.find((ti) => ti.toolName === 'write_artifact')
      : null;
    const artifactTitle =
      artifactCall?.args?.title ||
      artifactCall?.args?.identifier ||
      files?.[0]?.title ||
      files?.[0]?.identifier ||
      '';
    const artifactContent = artifactCall?.args?.content || files?.[0]?.content || '';
    const artifactSummary = useMemo(() => extractFileSummary(artifactContent), [artifactContent]);

    const isToolDone = !hasWriteArtifact || toolInvocations?.every(
      (ti) => !ARTIFACT_TOOL_NAMES.has(ti.toolName) || ti.state === 'result',
    );

    const {
      phase,
      streamedIntention,
    } = useWriteArtifactStream(!!hasWriteArtifact, contentBeforeTool, isToolDone);

    const hasPendingSearch = toolInvocations?.some(
      (ti) => ti.toolName !== 'write_artifact' && ti.state !== 'result',
    );
    const showFooterActions = !isStreaming && !hasPendingSearch;

    const showWritingLine = hasWriteArtifact && artifactTitle && (
      phase === 'intention' || phase === 'writing'
    );

    const researchCalls = useMemo(() => {
      if (!toolInvocations) return [];
      return toolInvocations.filter((ti) => RESEARCH_TOOL_NAMES.has(ti.toolName));
    }, [toolInvocations]);

    const hasResearchSteps = researchCalls.length > 0;

    const hasActionSummary = actionSummary != null && (actionSummary.actions.length > 0 || isStreaming);

    const [spinnerFrame, setSpinnerFrame] = useState(0);
    useEffect(() => {
      if (!isStreaming) return;
      const id = setInterval(() => setSpinnerFrame(f => (f + 1) % 4), 200);
      return () => clearInterval(id);
    }, [isStreaming]);
    const SPINNER_CHARS = ['◐', '◓', '◑', '◒'];

    const hasTools = hasActionSummary || hasResearchSteps;
    const actionCount = actionSummary?.actions?.length ?? researchCalls.length;
    const duration = completionDuration ? Math.round(completionDuration / 1000) : null;
    const showUnifiedPanel = isStreaming || reasoning || hasTools;

    let headerLabel = 'thought';
    const headerParts: string[] = [];
    if (hasTools) headerParts.push(`${actionCount} action${actionCount > 1 ? 's' : ''}`);
    if (duration) headerParts.push(`${duration}s`);
    if (headerParts.length > 0) headerLabel += ` · ${headerParts.join(' · ')}`;

    return (
      <div className="mb-10 w-full group/bubble">
        <div className="text-base px-4 break-words flex flex-col gap-1">
          {showUnifiedPanel && (
            <Collapsible className="not-prose mb-4" defaultOpen={false}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors cursor-pointer hover:text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  {isStreaming && (
                    <span className="inline-flex items-center justify-center size-4 text-sm leading-none">{SPINNER_CHARS[spinnerFrame]}</span>
                  )}
                  <span className={cn(isStreaming ? "writing-shimmer-text" : "")}>
                    {isStreaming ? 'thinking' : headerLabel}
                  </span>
                </span>
              </CollapsibleTrigger>
              {(reasoning || hasResearchSteps || hasActionSummary) && (
                <CollapsibleContent className="mt-4 text-sm space-y-4 text-muted-foreground">
                  {reasoning && (
                    <MarkdownErrorBoundary rawContent={reasoning}>
                      <Streamdown>{reasoning}</Streamdown>
                    </MarkdownErrorBoundary>
                  )}
                  {hasResearchSteps && (
                    <div className="space-y-3">
                      {researchCalls.map((tc, i) => {
                        const isComplete = tc.state === 'result';
                        return (
                          <ChainOfThoughtStep
                            key={tc.toolCallId || i}
                            icon={isComplete ? CheckIcon : SearchIcon}
                            label={tc.args?.url || tc.args?.query || tc.toolName}
                            status={isComplete ? 'complete' : 'active'}
                          >
                            {isComplete && (tc.result?.sources?.length > 0 || tc.result?.pages?.length > 0) && (
                              <ChainOfThoughtSearchResults>
                                {(tc.result?.sources || tc.result?.pages || []).map((s: any, j: number) => {
                                  let domain = s.url || s.metadata?.sourceURL || '';
                                  try { domain = new URL(domain).hostname; } catch {}
                                  return <ChainOfThoughtSearchResult key={j}>{domain}</ChainOfThoughtSearchResult>;
                                })}
                              </ChainOfThoughtSearchResults>
                            )}
                          </ChainOfThoughtStep>
                        );
                      })}
                    </div>
                  )}
                  {hasActionSummary && (
                    <ActionTimeline actions={actionSummary!.actions} />
                  )}
                </CollapsibleContent>
              )}
            </Collapsible>
          )}

          {hasWriteArtifact ? (
            <>
              {phase === 'intention' && streamedIntention && (
                <div className="font-normal text-foreground stagger-item stagger-0 leading-[1.2]">
                  <MarkdownMessage content={streamedIntention} sources={[]} />
                </div>
              )}

              {(phase === 'writing' || phase === 'done') && contentBeforeTool && (
                <div className="font-normal text-foreground leading-[1.2]">
                  <MarkdownMessage content={contentBeforeTool} sources={[]} />
                </div>
              )}

              {showWritingLine && (
                <div className={`text-xs ${phase === 'writing' ? 'writing-shimmer-text' : 'text-muted-foreground'}`}>
                  writing — {artifactTitle}
                </div>
              )}

              {phase === 'done' && artifactSummary && !contentAfterTool && (
                <div className="text-xs text-muted-foreground/80 leading-relaxed">
                  {artifactSummary}
                </div>
              )}

              {phase === 'done' && contentAfterTool && (
                <div className="font-normal text-foreground leading-[1.2]">
                  <MarkdownMessage content={contentAfterTool} sources={[]} />
                </div>
              )}

              {phase === 'done' && !contentBeforeTool && !contentAfterTool && content && (
                <div className="font-normal text-foreground leading-[1.2]">
                  <MarkdownMessage content={content} sources={[]} />
                </div>
              )}
            </>
            ) : (
            content ? (
              <div className="font-normal text-foreground leading-[1.2]">
                <MarkdownMessage content={content} sources={[]} />
              </div>
            ) : null
          )}
        </div>

        {phase === 'done' && files && files.length > 0 && onOpenFile && (
          <div className="px-4 pb-2">
            <FilePreviewCard
              file={files[0]}
              onClick={() => onOpenFile(files[0])}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 px-4 mt-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity" style={{ userSelect: 'none' }}>
          {showFooterActions && (
            <>
              <BubbleActions
                allSources={[]}
                version={version}
                onCopy={onCopy}
              />
            </>
          )}
          {model && (
            <span className="text-[11px] font-medium text-muted-foreground select-none whitespace-nowrap truncate max-w-[120px]">{model}</span>
          )}
          {completionDuration !== undefined && (
            <span className="text-[11px] text-muted-foreground/60">
              {(completionDuration / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    );
  }
);
