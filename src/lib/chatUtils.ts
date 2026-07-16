import type { FileItem } from '../types/file-panel';
import { parseFiles } from './fileParser';

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
  files?: FileItem[];
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

function extractWriteArtifactFiles(toolInvocations: any[]): any[] {
  return (toolInvocations || [])
    .filter((ti: any) => ti.toolName === 'write_artifact' && ti.args?.identifier && ti.args?.content)
    .map((call: any) => ({
      identifier: call.args.identifier,
      type: call.args.type || 'code',
      title: call.args.title || call.args.identifier,
      language: call.args.language,
      content: call.args.content,
      version: 0,
      createdAt: Date.now(),
    }));
}

function extractContentToolFiles(toolInvocations: any[]): any[] {
  const contentToolCalls = (toolInvocations || [])
    .filter((ti: any) => ti.state === 'result' && (
      ti.toolName === 'write_article'
      || ti.toolName === 'edit_text'
      || ti.toolName === 'research'
      || ti.toolName === 'generate_script'
    ));

  return contentToolCalls.map((call: any) => {
    const result = call.result;
    if (!result) return null;
    if (call.toolName === 'write_article' && result.content) {
      return { identifier: result.articleId || call.toolCallId, type: 'doc' as const, title: result.title || result.articleId, content: result.content, version: 0, createdAt: Date.now() };
    }
    if (call.toolName === 'edit_text' && result.text) {
      return { identifier: call.toolCallId, type: 'doc' as const, title: 'Edited Text', content: result.text, version: 0, createdAt: Date.now() };
    }
    if (call.toolName === 'research' && result.summary) {
      const srcText = (result.sources || []).map((s: any) => `- ${s.title}\n  ${s.snippet}`).join('\n');
      const content = result.summary + (srcText ? `\n\n---\n\n${srcText}` : '');
      const title = result.summary.trim().split('\n')[0].slice(0, 50);
      return { identifier: call.toolCallId, type: 'pdf' as const, title, content, version: 0, createdAt: Date.now() };
    }
    if (call.toolName === 'generate_script' && result.scenes) {
      const content = result.scenes.map((s: any) =>
        `Scene ${s.sceneNumber} (${s.duration}s)\n${s.narration}\n${s.visualDescription}`
      ).join('\n\n---\n\n');
      return { identifier: result.scriptId || call.toolCallId, type: 'doc' as const, title: 'Video Script', content, version: 0, createdAt: Date.now() };
    }
    return null;
  }).filter(Boolean);
}

function extractFilesFromToolInvocations(toolInvocations: any[]): any[] {
  const writeArtifactFiles = extractWriteArtifactFiles(toolInvocations);
  const contentToolFiles = extractContentToolFiles(toolInvocations);
  return [...writeArtifactFiles, ...contentToolFiles];
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

  let toolFiles = extractFilesFromToolInvocations(toolInvocations || []);

  let parsedFiles: FileItem[] = [];
  let cleanContentStr = dedupedContent;
  if (toolFiles.length === 0) {
    const parsed = parseFiles(dedupedContent);
    parsedFiles = parsed.files;
    if (parsed.files.length > 0) {
      cleanContentStr = parsed.cleanText;
    }
  }

  const allFiles = [...parsedFiles, ...toolFiles];
  const finalContent = sanitizeMarkdownContent(cleanContentStr);

  const { contentBeforeTool, contentAfterTool } = buildContentBeforeAfter(m.parts);

  return {
    ...m,
    content: finalContent,
    reasoning: finalReasoning,
    toolInvocations,
    contentBeforeTool: contentBeforeTool ?? m.contentBeforeTool,
    contentAfterTool: contentAfterTool ?? m.contentAfterTool,
    files: allFiles,
    hasPartialArtifact: hasPartialArtifact(dedupedContent),
  };
};

export const hydrateStoredMessage = (m: Record<string, any> | null | undefined): LegacyMessage | null | undefined => {
  if (!m) return m as LegacyMessage | null | undefined;

  const content = m.content || '';
  const { cleanContent, thinking } = extractThinkTags(content);

  const finalReasoning = thinking
    ? (m.reasoning ? `${m.reasoning}\n${thinking}` : thinking)
    : (m.reasoning || '');

  let files: any[] = m.files;
  if (!files || files.length === 0) {
    files = extractFilesFromToolInvocations(m.toolInvocations || []);
  }

  const { files: parsedFiles, cleanText } = parseFiles(cleanContent);
  if (parsedFiles.length > 0) {
    files = [...files, ...parsedFiles];
  }

  return {
    ...m,
    content: sanitizeMarkdownContent(parsedFiles.length > 0 ? cleanText : cleanContent),
    reasoning: finalReasoning,
    files,
    hasPartialArtifact: hasPartialArtifact(cleanContent),
  };
};
