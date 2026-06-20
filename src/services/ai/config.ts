import { z } from 'zod';

export const SYSTEM_PROMPT = `You are Vibe-Coding Agent, a personal assistant and expert developer similar to OpenAI Codex.
Your goal is to be helpful, concise, and efficient. Always respond with text unless a tool call is explicitly required.

You have access to these tools — use them only when directly relevant to the user's request:
- 'create_artifact': Generate rich, interactive frontend components (React, HTML, charts, slides) for the user to preview.
- 'read_file': Read a file in the project workspace. Always read before editing.
- 'write_file': Create or completely overwrite a file in the project workspace.
- 'edit_file': Edit a specific block inside a file using exact search-and-replace.
- 'write_to_plan': Write or update plan.md or todo.md — use this when the user asks to create a plan, roadmap, checklist, or todo list, and keep it updated as tasks are completed.
- 'list_dir': List files and directories in a given path.
- 'grep_tool': Search for a pattern in the project files.

### CODING ENVIRONMENT (PROJECT MODE)
If you are provided with a PROJECT CONTEXT, you are working within a real codebase on the user's local disk.
- Use the file tools to read, create, and edit files in the project.
- Always maintain the file structure relative to the project root.
`;

export const createArtifactTool = {
  description: 'Create or update an interactive artifact for user preview',
  parameters: z.object({
    type: z.enum(['react', 'html', 'markdown', 'chart', 'sheet', 'slides']),
    title: z.string().describe('Descriptive title for the artifact'),
    content: z.string().describe('The full content of the artifact or file code'),
    file_path: z
      .string()
      .optional()
      .describe('Relative path within the project (e.g., "src/components/Button.tsx")'),
    intent_message: z
      .string()
      .optional()
      .describe('A brief, human-readable status message about what you are creating.'),
  }),
};

export const readFileTool = {
  description: 'Read the contents of an existing file in the project workspace',
  parameters: z.object({
    file_path: z
      .string()
      .describe('Relative path to the file from the project root (e.g., "src/App.tsx")'),
  }),
};

export const writeFileTool = {
  description:
    'Create a new file or completely overwrite an existing file in the project workspace',
  parameters: z.object({
    file_path: z
      .string()
      .describe(
        'Relative path to the file from the project root (e.g., "src/components/Card.tsx")'
      ),
    content: z.string().describe('The complete content to write to the file'),
  }),
};

export const editFileTool = {
  description:
    'Edit a specific block of code in an existing file by replacing target_content with replacement_content',
  parameters: z.object({
    file_path: z
      .string()
      .describe('Relative path to the file from the project root (e.g., "src/index.css")'),
    target_content: z
      .string()
      .describe(
        'The exact block of code to search for. Must match the file content exactly including whitespace.'
      ),
    replacement_content: z.string().describe('The new code block to replace target_content'),
  }),
};

export const writeToPlanTool = {
  description: 'Write or update a project plan or checklist in plan.md or todo.md',
  parameters: z.object({
    filename: z
      .enum(['plan.md', 'todo.md'])
      .describe('The plan file to write to (plan.md or todo.md)'),
    content: z.string().describe('The complete markdown content of the plan and todo checklist'),
  }),
};

export const listDirTool = {
  description: 'List files and directories in a given path relative to the project root',
  parameters: z.object({
    path: z
      .string()
      .describe('The directory path to list (e.g., "src/components")')
      .default('.'),
  }),
};

export const grepTool = {
  description: 'Search for a pattern in the project files',
  parameters: z.object({
    pattern: z.string().describe('The search pattern (regex supported)'),
    path: z
      .string()
      .describe('The directory path to search in (e.g., "src")')
      .default('.'),
  }),
};
