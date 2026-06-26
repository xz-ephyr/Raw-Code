import { parseArtifacts } from './artifactParser';

const artifactMetadataRegex = /^\s*\*\s*(?:Type|Identifier|Title):\s*`[^`]+`\s*$/gim;

export function cleanReasoning(reasoning: string): string {
  return reasoning
    .split('\n')
    .filter((line) => !artifactMetadataRegex.test(line))
    .join('\n')
    .trim();
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

  // Extract artifacts from content
  const { artifacts: parsedArtifacts, cleanText } = parseArtifacts(content);

  // Extract artifacts from writeArtifact tool calls
  const toolArtifacts = (toolInvocations || [])
    .filter((ti: any) => ti.toolName === 'writeArtifact' && ti.args?.identifier && ti.args?.content)
    .map((ti: any) => ({
      identifier: ti.args.identifier,
      type: ti.args.type || 'code',
      title: ti.args.title || ti.args.identifier,
      language: ti.args.language,
      content: ti.args.content,
      version: 0,
      createdAt: Date.now(),
    }));

  const allArtifacts = [...parsedArtifacts, ...toolArtifacts];

  return {
    ...m,
    content: cleanText || content,
    reasoning,
    toolInvocations,
    artifacts: allArtifacts,
    hasPartialArtifact: hasPartialArtifact(content),
  };
};
