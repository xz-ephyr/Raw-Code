import type { Artifact } from '../types/artifact';
import { parseArtifacts } from './artifactParser';

const artifactMetadataRegex = /^\s*\*\s*(?:Type|Identifier|Title):\s*`[^`]+`\s*$/im;
const artifactInlineRegex = /^\s*`identifier`:\s*`[^`]+`\s*\*\s*`type`:\s*`[^`]+`\s*\*\s*`title`:\s*`[^`]+`/i;

// Strip search result content that leaks into reasoning
const searchResultRegex = /(?:^|\n)(?:Results?|Search results?)(?:\s*\d*)?:.*(?:\n|$)/gi;
const urlInReasoningRegex = /(?:^|\n)\s*[-•*]\s*https?:\/\/\S+/gm;
const resultBlockRegex = /(?:^|\n)(?:\d+\.\s*\[.*?\]\(.*?\)|\[\d+\]:\s*https?:\/\/\S+)/gm;

// Strip meta-cognition garbage: self-referential loops about failing tool calls
const metaCognitionLineRegex = /^(?:I\s+(?:am|keep|will|must|should|need|can|have|was|had|shall)|I'm|Let\s+me|Wait[\s,]+I|Actually[\s,]+|Okay[\s,]+|Hmm[\s,]+|The\s+(?:error|previous|tool|call|API)\s|This\s+(?:is|suggests|means)|Looking\s+(?:at|back)|As\s+of\s+my\s+current|After\s+|I'll|I've|I'd).*/gim;
const retryPhraseRegex = /(?:Try\s+(?:a|the|again|one)|Retry|Attempt\s+\d|Again,?|One more|Let me\s+(?:try|see|check|look|be|do|make)|I will\s+(?:now|try|attempt|call|remove|omit|use|just|simply|consciously|absolutely|be|not)|I keep\s+(?:including|making|doing|typing|getting|sending|adding|forgetting)|I am\s+(?:struggling|failing|having|experiencing|going|literally|typing|unable|in\s+a|somehow|clearly|repeating)|I must\s+(?:stop|try|remove|omit|not)|I should\s+(?:try|just|probably|really)|I cannot\s+(?:stop|seem|figure)|Wait,\s+I\s+(?:am|see|keep|will)|Actually,?\s+(?:looking|I|the|let)|Okay,?\s+(?:I|let|the|so|enough)|I'm\s+(?:going|having|struggling|failing|in|literally|an\s+AI))[\s\S]*?(?:\n|$)/gim;

export function cleanReasoning(reasoning: string): string {
  let cleaned = reasoning
    .split('\n')
    .filter((line) => !artifactMetadataRegex.test(line) && !artifactInlineRegex.test(line))
    .join('\n');
  cleaned = cleaned.replace(searchResultRegex, '');
  cleaned = cleaned.replace(urlInReasoningRegex, '');
  cleaned = cleaned.replace(resultBlockRegex, '');
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
  cleaned = cleaned.replace(metaCognitionLineRegex, '');
  cleaned = cleaned.replace(retryPhraseRegex, '');
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

export function hasPartialArtifact(content: string): boolean {
  return /<antArtifact\b/i.test(content);
}

export function extractThinkTags(content: string): { cleanContent: string; thinking: string } {
  let cleanContent = content;
  const thinkingParts: string[] = [];

  const fullRegex = /<think>([\s\S]*?)<\/think>/gi;
  let match: RegExpExecArray | null;
  const regex = new RegExp(fullRegex.source, 'gi');
  while ((match = regex.exec(content)) !== null) {
    thinkingParts.push(match[1].trim());
    cleanContent = cleanContent.replace(match[0], '');
  }

  if (!content.includes('</think>')) {
    const incompleteRegex = /<think>([\s\S]*?)$/i;
    const incompleteMatch = incompleteRegex.exec(cleanContent);
    if (incompleteMatch) {
      thinkingParts.push(incompleteMatch[1].trim());
      cleanContent = cleanContent.replace(incompleteMatch[0], '');
    }
  }

  return {
    cleanContent: cleanContent.trim(),
    thinking: thinkingParts.join('\n'),
  };
}

export const mapUIMessageToLegacyMessage = (m: any): any => {
  if (!m) return m;

  // Extract content from parts if missing
  let content = m.content || '';
  if (!content && Array.isArray(m.parts)) {
    content = m.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
  }

  // Extract reasoning from parts if missing
  let reasoning = m.reasoning || '';
  if (!reasoning && Array.isArray(m.parts)) {
    reasoning = m.parts
      .filter((part: any) => part.type === 'reasoning')
      .map((part: any) => part.reasoning || (part as any).text || '')
      .join('');
  }

  // Strip artifact metadata from reasoning
  if (reasoning) {
    reasoning = cleanReasoning(reasoning);
  }

  // Strip reasoning text that leaks into content from thinking models
  if (reasoning && content) {
    const idx = content.indexOf(reasoning);
    if (idx !== -1) {
      content = (content.slice(0, idx) + content.slice(idx + reasoning.length)).trim();
    }
  }

  // Extract <think> tags from content (for models like Qwen that output thinking as plain text)
  const { cleanContent: thinkStripped, thinking } = extractThinkTags(content);
  content = thinkStripped;
  if (thinking) {
    reasoning = reasoning ? `${reasoning}\n\n${thinking}` : thinking;
  }

  // Extract toolInvocations from parts
  let toolInvocations = m.toolInvocations;
  if (!toolInvocations && Array.isArray(m.parts)) {
    toolInvocations = m.parts
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
          toolName: toolName,
          args: part.input,
          result: part.output,
          error: part.errorText,
        };
      });
  }

  // Extract artifacts — only from writeArtifact tool (first call only) OR antArtifact fallback, never both
  const writeArtifactCalls = (toolInvocations || [])
    .filter((ti: any) => ti.toolName === 'writeArtifact' && ti.args?.identifier && ti.args?.content);

  let parsedArtifacts: Artifact[] = [];
  let cleanText = content;
  let toolArtifacts: any[] = [];

  if (writeArtifactCalls.length > 0) {
    // Tool was used — take only the first call, skip antArtifact parsing to prevent duplicates
    const call = writeArtifactCalls[0];
    toolArtifacts = [{
      identifier: call.args.identifier,
      type: call.args.type || 'code',
      title: call.args.title || call.args.identifier,
      language: call.args.language,
      content: call.args.content,
      version: 0,
      createdAt: Date.now(),
    }];
  } else {
    // No tool call — fall back to parsing antArtifact tags from content
    const parsed = parseArtifacts(content);
    parsedArtifacts = parsed.artifacts;
    cleanText = parsed.cleanText;
  }

  const allArtifacts = [...parsedArtifacts, ...toolArtifacts];

  // Split content around writeArtifact tool call for shimmer placement
  let contentBeforeTool: string | undefined;
  let contentAfterTool: string | undefined;
  if (writeArtifactCalls.length > 0 && Array.isArray(m.parts)) {
    const writeToolPartIdx = m.parts.findIndex(
      (part: any) => {
        const type = part.type || '';
        const name = part.toolName || '';
        return (type === 'dynamic-tool' || type.startsWith('tool-')) &&
               (name === 'writeArtifact' || type.includes('writeArtifact'));
      }
    );
    if (writeToolPartIdx >= 0) {
      const rawBefore = m.parts
        .slice(0, writeToolPartIdx)
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
      const rawAfter = m.parts
        .slice(writeToolPartIdx + 1)
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
      contentBeforeTool = extractThinkTags(rawBefore).cleanContent;
      contentAfterTool = extractThinkTags(rawAfter).cleanContent;
    }
  }

  return {
    ...m,
    content: cleanText || content,
    reasoning,
    toolInvocations,
    contentBeforeTool,
    contentAfterTool,
    artifacts: allArtifacts,
    hasPartialArtifact: hasPartialArtifact(content),
  };
};
