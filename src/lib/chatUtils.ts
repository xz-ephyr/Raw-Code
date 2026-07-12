import type { Artifact } from '../types/artifact';
import { parseArtifacts } from './artifactParser';

export function sanitizeMarkdownContent(content: string): string {
  let result = content;
  result = result.replace(/^(#\d)/gm, '\\$1');
  return result;
}

export function hasPartialArtifact(content: string): boolean {
  return /<antArtifact\b|<write_artifact\b/i.test(content);
}

interface ToolInvocationPart {
  type?: string;
  toolName?: string;
  toolCallId?: string;
  input?: any;
  output?: any;
  state?: string;
  errorText?: string;
}

export interface UIMessage {
  id?: string;
  role?: string;
  content?: string;
  reasoning?: string | null;
  parts?: any[];
  toolInvocations?: any[];
  [key: string]: any;
}

export interface LegacyMessage {
  id?: string;
  role?: string;
  content?: string;
  reasoning?: string;
  toolInvocations?: any[];
  contentBeforeTool?: string;
  contentAfterTool?: string;
  artifacts?: Artifact[];
  hasPartialArtifact?: boolean;
  [key: string]: any;
}

function extractPartsContent(parts: any[]): string {
  return (parts || [])
    .filter((part: any) => part.type === 'text')
    .map((part: any) => part.text)
    .join('');
}

function extractPartsReasoning(parts: any[]): string {
  return (parts || [])
    .filter((part: any) => part.type === 'reasoning')
    .map((part: any) => part.reasoning || (part as any).text || '')
    .join('');
}

function extractToolInvocations(parts: any[]): ToolInvocationPart[] {
  return (parts || [])
    .filter((part: any) => part.type === 'dynamic-tool' || (part.type && part.type.startsWith('tool-')))
    .map((part: any) => {
      const toolName = part.toolName || (part.type ? part.type.replace(/^tool-/, '') : 'unknown');
      return {
        state:
          part.state === 'output-available'
            ? 'result'
            : part.state === 'input-available'
              ? 'call'
              : part.state,
        toolCallId: part.toolCallId,
        toolName,
        args: part.input,
        result: part.output,
        error: part.errorText,
      };
    });
}

export function extractThinkTags(content: string): { cleanContent: string; thinking: string } {
  const thinkingParts: string[] = [];

  let cleanContent = content.replace(/<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/g, (_, inner) => {
    thinkingParts.push(inner.trim());
    return '';
  });

  cleanContent = cleanContent.replace(/<(?:think|thought)>([\s\S]*)$/g, (_, inner) => {
    thinkingParts.push(inner.trim());
    return '';
  });

  return {
    cleanContent,
    thinking: thinkingParts.join('\n'),
  };
}

export function cleanReasoning(content: string): string {
  if (!content) return '';

  let result = content;

  // Strip artifact metadata lines (merge with \n)
  result = result.replace(/(?:\n|^)(?:\* (?:Type|Identifier|Title):\s*`[^`]*`\s*\n?)+/g, '\n');

  // Strip inline artifact format (full merge)
  result = result.replace(/(?:\n|^)(?:`[^`]+`:\s*`[^`]+`\s*\*\s*`[^`]+`:\s*`[^`]+`\s*\*\s*`[^`]+`:\s*`[^`]+`\s*\n?)+/g, '');

  // Strip search result headers (full merge)
  result = result.replace(/(?:\n|^)(?:Search results \d+:\n?)+/g, '');
  result = result.replace(/(?:\n|^)(?:Results:\n?)+/g, '');

  // Strip URLs in bullet lists (merge with \n)
  result = result.replace(/(?:\n|^)(?:- https?:\/\/\S+\n?)+/g, '\n');

  // Strip numbered reference URLs (merge with \n)
  result = result.replace(/(?:\n|^)(?:\d+\.\s+\[[^\]]+\]\(https?:\/\/\S+\)\n?)+/g, '\n');
  result = result.replace(/(?:\n|^)(?:\[\d+\]:\s+https?:\/\/\S+\n?)+/g, '\n');

  // Strip meta-cognition lines (preserve surrounding newlines)
  result = result.replace(/^I am struggling with (?:the |this |a )?(?:same )?tool call[^.\n]*\.?$/gim, '');

  // Strip explicit failure loops (preserve surrounding newlines)
  result = result.replace(/^I am struggling with the same error repeatedly[^.\n]*\.?$/gim, '');

  // Collapse excessive newlines (3+ → 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  result = result.trim();

  return result;
}

function buildContentBeforeAfter(parts: any[] | undefined, contentBeforeTool?: string, contentAfterTool?: string) {
  if (!Array.isArray(parts)) return { contentBeforeTool, contentAfterTool };

  const writeToolPartIdx = parts.findIndex(
    (part: any) => {
      const type = part.type || '';
      const name = part.toolName || '';
      return (type === 'dynamic-tool' || type.startsWith('tool-')) &&
             (name === 'write_artifact' || type.includes('write_artifact') || type.includes('writeArtifact'));
    }
  );

  if (writeToolPartIdx < 0) return { contentBeforeTool: undefined, contentAfterTool: undefined };

  const rawBefore = parts
    .slice(0, writeToolPartIdx)
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('');

  const rawAfter = parts
    .slice(writeToolPartIdx + 1)
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('');

  const { cleanContent: cleanBefore } = extractThinkTags(rawBefore);
  const { cleanContent: cleanAfter } = extractThinkTags(rawAfter);

  return {
    contentBeforeTool: cleanBefore.trim() || undefined,
    contentAfterTool: cleanAfter.trim() || undefined,
  };
}

export const mapUIMessageToLegacyMessage = (m: UIMessage | null | undefined): LegacyMessage | null | undefined => {
  if (!m) return m;

  const content = m.content || (Array.isArray(m.parts) ? extractPartsContent(m.parts) : '');
  const reasoning = m.reasoning || (Array.isArray(m.parts) ? extractPartsReasoning(m.parts) : '');

  const { cleanContent, thinking } = extractThinkTags(content);

  let dedupedContent = cleanContent;
  if (reasoning && dedupedContent.includes(reasoning)) {
    dedupedContent = dedupedContent.replace(reasoning, '');
  }

  const finalReasoning = thinking
    ? (reasoning ? `${reasoning}\n${thinking}` : thinking)
    : reasoning;

  let toolInvocations = m.toolInvocations;
  if (!toolInvocations && Array.isArray(m.parts)) {
    toolInvocations = extractToolInvocations(m.parts);
  }

  const writeArtifactCalls = (toolInvocations || [])
    .filter((ti: any) => ti.toolName === 'write_artifact' && ti.args?.identifier && ti.args?.content);

  let parsedArtifacts: Artifact[] = [];
  let toolArtifacts: any[] = [];

  if (writeArtifactCalls.length > 0) {
    toolArtifacts = writeArtifactCalls.map((call: any) => ({
      identifier: call.args.identifier,
      type: call.args.type || 'code',
      title: call.args.title || call.args.identifier,
      language: call.args.language,
      content: call.args.content,
      version: 0,
      createdAt: Date.now(),
    }));
  } else {
    const parsed = parseArtifacts(dedupedContent);
    parsedArtifacts = parsed.artifacts;
  }

  const allArtifacts = [...parsedArtifacts, ...toolArtifacts];
  const finalContent = sanitizeMarkdownContent(dedupedContent);

  const { contentBeforeTool, contentAfterTool } = buildContentBeforeAfter(m.parts);

  return {
    ...m,
    content: finalContent,
    reasoning: finalReasoning,
    toolInvocations,
    contentBeforeTool: contentBeforeTool ?? m.contentBeforeTool,
    contentAfterTool: contentAfterTool ?? m.contentAfterTool,
    artifacts: allArtifacts,
    hasPartialArtifact: hasPartialArtifact(dedupedContent),
  };
};
