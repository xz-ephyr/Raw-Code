export interface ProjectContext {
  name: string;
  path: string;
  files: string;
}

export function getSmartSystemPrompt(basePrompt: string, projectContext?: ProjectContext) {
  if (!projectContext) return basePrompt;

  return `${basePrompt}

## Project Context

You are inside a folder named "${projectContext.name}" located at \`${projectContext.path}\`.

You do **not** have file contents preloaded into context. Below is only the directory structure (paths):

${projectContext.files}

To explore the codebase, use \`read_file\` to read file contents, \`grep_files\` or \`code_search\` to search file contents, and \`list_directory\` to list directory contents. Always read files before editing them.`;
}
