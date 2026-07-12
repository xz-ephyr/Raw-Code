import type { Artifact } from '../types/artifact';
import { parseArtifacts } from './artifactParser';

export function sanitizeMarkdownContent(content: string): string {
  let result = content;
  result = result.replace(/^(#\d)/gm, '\\$1');
  return result;
}

export function hasPartialArtifact(content: string): boolean {
  return /<antArtifact\b/i.test(content);
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

function buildContentBeforeAfter(parts: any[] | undefined, contentBeforeTool?: string, contentAfterTool?: string) {
  if (!Array.isArray(parts)) return { contentBeforeTool, contentAfterTool };

  const writeToolPartIdx = parts.findIndex(
    (part: any) => {
      const type = part.type || '';
      const name = part.toolName || '';
      return (type === 'dynamic-tool' || type.startsWith('tool-')) &&
             (name === 'writeArtifact' || type.includes('writeArtifact'));
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

  return {
    contentBeforeTool: rawBefore.trim() || undefined,
    contentAfterTool: rawAfter.trim() || undefined,
  };
}

export const mapUIMessageToLegacyMessage = (m: UIMessage | null | undefined): LegacyMessage | null | undefined => {
  if (!m) return m;

  const content = m.content || (Array.isArray(m.parts) ? extractPartsContent(m.parts) : '');
  const reasoning = m.reasoning || (Array.isArray(m.parts) ? extractPartsReasoning(m.parts) : '');

  let toolInvocations = m.toolInvocations;
  if (!toolInvocations && Array.isArray(m.parts)) {
    toolInvocations = extractToolInvocations(m.parts);
  }

  const writeArtifactCalls = (toolInvocations || [])
    .filter((ti: any) => ti.toolName === 'writeArtifact' && ti.args?.identifier && ti.args?.content);

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
    const parsed = parseArtifacts(content);
    parsedArtifacts = parsed.artifacts;
  }

  const allArtifacts = [...parsedArtifacts, ...toolArtifacts];
  const finalContent = sanitizeMarkdownContent(content);

  const { contentBeforeTool, contentAfterTool } = buildContentBeforeAfter(m.parts);

  return {
    ...m,
    content: finalContent,
    reasoning,
    toolInvocations,
    contentBeforeTool: contentBeforeTool ?? m.contentBeforeTool,
    contentAfterTool: contentAfterTool ?? m.contentAfterTool,
    artifacts: allArtifacts,
    hasPartialArtifact: hasPartialArtifact(content),
  };
};
