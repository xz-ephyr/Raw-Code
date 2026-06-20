export const mapUIMessageToLegacyMessage = (m: any): any => {
  if (!m) return m;
  let content = m.content || '';
  if (!content && Array.isArray(m.parts)) {
    content = m.parts.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('');
  }
  let reasoning = m.reasoning || '';
  if (!reasoning && Array.isArray(m.parts)) {
    reasoning = m.parts.filter((part: any) => part.type === 'reasoning').map((part: any) => part.reasoning || (part as any).text || '').join('');
  }
  let toolInvocations = m.toolInvocations;
  if (!toolInvocations && Array.isArray(m.parts)) {
    toolInvocations = m.parts.filter((part: any) => part.type === 'dynamic-tool' || part.type.startsWith('tool-')).map((part: any) => {
      const toolName = part.toolName || part.type.replace(/^tool-/, '');
      return {
        state: part.state === 'output-available' ? 'result' : part.state === 'input-available' ? 'call' : part.state,
        toolCallId: part.toolCallId,
        toolName: toolName,
        args: part.input,
        result: part.output,
        error: part.errorText,
      };
    });
  }
  return { ...m, content, reasoning, toolInvocations };
};
