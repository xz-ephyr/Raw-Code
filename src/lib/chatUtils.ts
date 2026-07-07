import type { Artifact } from '../types/artifact';
import { parseArtifacts } from './artifactParser';

// ── Regex: Artifact metadata lines ──────────────────────────────────
// Applied line-by-line after split(\n), so no /m flag needed

const artifactMetadataRegex = /^\s*\*\s*(?:Type|Identifier|Title):\s*`[^`]+`\s*$/i;
const artifactInlineRegex = /^\s*`identifier`:\s*`[^`]+`\s*\*\s*`type`:\s*`[^`]+`\s*\*\s*`title`:\s*`[^`]+`/i;

// ── Regex: Search result noise that leaks into reasoning ───────────

const searchResultRegex = /(?:^|\n)(?:Results?|Search results?)(?:\s*\d*)?:.*(?:\n|$)/gi;
const urlInReasoningRegex = /(?:^|\n)\s*[-•*]\s*https?:\/\/\S+/gm;
const resultBlockRegex = /(?:^|\n)(?:\d+\.\s*\[.*?\]\(.*?\)|\[\d+\]:\s*https?:\/\/\S+)/gm;

// ── Regex: Self-referential error/retry loops (narrow, safe) ────────
// Only catches clear failure spirals, NOT normal planning statements

const retryLoopRegex = /(?:^|\n)\s*(?:I(?:'m| am)\s+(?:struggling|failing|repeating|looping|stuck)|I keep\s+(?:making|repeating|getting|adding|forgetting)\s+(?:the\s+)?same|I cannot\s+(?:stop|seem)\s+(?:repeating|fixing?|getting)\s)\s.*$/gim;

// ── Regex: Tool call metadata leaking into reasoning ───────────────

const toolCallRefRegex = /(?:^|\n)\s*(?:(?:calling|using|invoking|running)\s+(?:the\s+)?(?:web_search|fetchPage|imageSearch|newsSearch|webSearch|writeArtifact|subagent_run|read_file|edit_file|write_file|run_command|git_status|list_directory|grep_files|find_files|glob_files|code_search))\s.*$/gim;
const toolResultRefRegex = /(?:^|\n)\s*(?:(?:the\s+)?(?:search|tool|function|call)\s+(?:returned|result|completed|finished|executed|done|gave|produced|showed))\s.*$/gim;
const queryParamRegex = /(?:^|\n)\s*(?:query|q)\s*[=:]\s*["'].+?["']\s*$/gim;
const toolMetadataLineRegex = /(?:^|\n)\s*(?:toolCallId|toolName|args|input|output|result|state)\s*[=:].*$/gim;

export function cleanReasoning(reasoning: string): string {
  if (typeof reasoning !== 'string') return '';

  let cleaned = reasoning
    .split('\n')
    .filter((line) => !artifactMetadataRegex.test(line) && !artifactInlineRegex.test(line))
    .join('\n');

  cleaned = cleaned
    .replace(searchResultRegex, '\n')
    .replace(urlInReasoningRegex, '\n')
    .replace(resultBlockRegex, '\n')
    .replace(retryLoopRegex, '\n')
    .replace(toolCallRefRegex, '\n')
    .replace(toolResultRefRegex, '\n')
    .replace(queryParamRegex, '\n')
    .replace(toolMetadataLineRegex, '\n');

  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

export function sanitizeMarkdownContent(content: string): string {
  let result = content;
  result = result.replace(/^(#\d)/gm, '\\$1');
  return result;
}

export function hasPartialArtifact(content: string): boolean {
  return /<antArtifact\b/i.test(content);
}

export function extractThinkTags(content: string): { cleanContent: string; thinking: string } {
  if (typeof content !== 'string') return { cleanContent: '', thinking: '' };

  let cleanContent = content;
  const thinkingParts: string[] = [];

  const thinkPairRegex = /<think>([\s\S]*?)<\/think>/gi;
  let match: RegExpExecArray | null;
  while ((match = thinkPairRegex.exec(content)) !== null) {
    thinkingParts.push(match[1].trim());
    cleanContent = cleanContent.replace(match[0], '');
  }

  const incompleteRegex = /<think>([\s\S]*?)$/i;
  const incompleteMatch = incompleteRegex.exec(cleanContent);
  if (incompleteMatch) {
    thinkingParts.push(incompleteMatch[1].trim());
    cleanContent = cleanContent.replace(incompleteMatch[0], '');
  }

  return {
    cleanContent: cleanContent.trim(),
    thinking: thinkingParts.join('\n'),
  };
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
    contentBeforeTool: extractThinkTags(rawBefore).cleanContent || undefined,
    contentAfterTool: extractThinkTags(rawAfter).cleanContent || undefined,
  };
}

export const mapUIMessageToLegacyMessage = (m: UIMessage | null | undefined): LegacyMessage | null | undefined => {
  if (!m) return m;

  const content = m.content || (Array.isArray(m.parts) ? extractPartsContent(m.parts) : '');
  let reasoning = m.reasoning || (Array.isArray(m.parts) ? extractPartsReasoning(m.parts) : '');

  if (reasoning) {
    reasoning = cleanReasoning(reasoning);
  }

  // Extract toolInvocations
  let toolInvocations = m.toolInvocations;
  if (!toolInvocations && Array.isArray(m.parts)) {
    toolInvocations = extractToolInvocations(m.parts);
  }

  // Extract artifacts from writeArtifact tool calls
  const writeArtifactCalls = (toolInvocations || [])
    .filter((ti: any) => ti.toolName === 'writeArtifact' && ti.args?.identifier && ti.args?.content);

  let parsedArtifacts: Artifact[] = [];
  let baseCleanText = content;
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
    // Parse antArtifact tags from original content first
    const parsed = parseArtifacts(content);
    parsedArtifacts = parsed.artifacts;
    baseCleanText = parsed.cleanText;
  }

  const allArtifacts = [...parsedArtifacts, ...toolArtifacts];

  // Strip reasoning that leaked into content (from some models)
  let cleanContent = baseCleanText;
  if (reasoning && cleanContent) {
    const idx = cleanContent.indexOf(reasoning);
    if (idx !== -1) {
      cleanContent = (cleanContent.slice(0, idx) + cleanContent.slice(idx + reasoning.length)).trim();
    }
  }

  // Extract <think> tags from content (models like Qwen output thinking as plain text)
  const { cleanContent: thinkStripped, thinking } = extractThinkTags(cleanContent);
  cleanContent = thinkStripped;
  if (thinking) {
    reasoning = reasoning ? `${reasoning}\n\n${thinking}` : thinking;
  }

  // Split content around writeArtifact tool call for shimmer placement
  const { contentBeforeTool, contentAfterTool } = buildContentBeforeAfter(m.parts);

  const finalContent = sanitizeMarkdownContent(cleanContent);

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
