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

Below is the full folder structure and the contents of all readable files:

${projectContext.files}

Use this information to answer questions about the folder's structure and contents. When the user asks about files, data, or anything inside this folder, refer to the file tree and contents above.`;
}
