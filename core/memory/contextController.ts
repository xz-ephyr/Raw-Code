import type { ProjectMemoryEntry } from './projectMemory';

export interface ProjectContext {
  name: string;
  path: string;
  files: string;
}

export function getSmartSystemPrompt(basePrompt: string, projectContext?: ProjectContext, projectMemory?: ProjectMemoryEntry[]) {
  let prompt = basePrompt;

  if (projectContext) {
    prompt += `

## Project Context

You are inside a folder named "${projectContext.name}" located at \`${projectContext.path}\`.

You do **not** have file contents preloaded into context. Below is only the directory structure (paths):

${projectContext.files}

To explore the codebase, use \`read_file\` to read file contents, \`search_codebase\` to search file contents or find files by name, and \`list_directory\` to list directory contents. Always read files before editing them.`;
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
