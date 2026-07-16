function needsClosingFence(content: string): boolean {
  const lines = content.split('\n');
  let inFence = false;
  for (const line of lines) {
    if (/^ {0,3}```/.test(line)) {
      inFence = !inFence;
    }
  }
  return inFence;
}

export function prepareStreamingContent(content: string): string {
  const trimmed = content;
  if (!trimmed) return trimmed;

  if (needsClosingFence(trimmed)) {
    return trimmed + '\n```';
  }

  const incompleteCitation = /【[^】]*$/m;
  if (incompleteCitation.test(trimmed)) {
    return trimmed.replace(incompleteCitation, '');
  }

  return trimmed;
}
