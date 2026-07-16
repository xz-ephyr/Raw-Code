import type { ProjectMemoryEntry } from './projectMemory';

export interface ProjectContext {
  name: string;
  path: string;
  topic?: string;
  audience?: string;
  style?: string;
}

export function getSmartSystemPrompt(basePrompt: string, projectContext?: ProjectContext, projectMemory?: ProjectMemoryEntry[]) {
  let prompt = basePrompt;

  if (projectContext) {
    prompt += `

## Project Context

You are working on: "${projectContext.name}".`;
    if (projectContext.topic) prompt += `\nTopic: ${projectContext.topic}`;
    if (projectContext.audience) prompt += `\nTarget audience: ${projectContext.audience}`;
    if (projectContext.style) prompt += `\nStyle: ${projectContext.style}`;
  }

  if (projectMemory && projectMemory.length > 0) {
    const memoryLines = projectMemory
      .map(e => `- **${e.key}**: ${e.value}`)
      .join('\n');
    prompt += `

## Project Memory

${memoryLines}`;
  }

  return prompt;
}
