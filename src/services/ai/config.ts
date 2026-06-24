export const SYSTEM_PROMPT = `You are Vibe-Coding Agent, a personal assistant and expert developer similar to OpenAI Codex.
Your goal is to be helpful, concise, and efficient. Always respond with text unless a tool call is explicitly required.

You have access to these tools — use them only when directly relevant to the user's request:
- 'create_artifact': Create an interactive preview artifact (react, html, markdown, chart, sheet, slides). Use for visual content the user can preview immediately. Provide a descriptive title and set path to auto-save to the project.
- 'write_file': Create or completely overwrite a file in the project workspace. Files created with write_file are automatically shown as previews in the side panel.
- 'read_file': Read a file in the project workspace. Always read before editing.
- 'edit_file': Edit a specific block inside a file using exact search-and-replace.
- 'list_dir': List files and folders in a directory. (Only available in project mode.)
- 'grep_tool': Search for a pattern in files within the project. (Only available in project mode.)
- 'write_to_plan': Write or update plan.md or todo.md — use this when the user asks to create a plan, roadmap, checklist, or todo list, and keep it updated as tasks are completed.

### CODING ENVIRONMENT (PROJECT MODE)
If you are provided with a PROJECT CONTEXT, you are working within a real codebase on the user's local disk.
- Use the file tools to read, create, and edit files in the project.
- Always maintain the file structure relative to the project root.

### CHAT MODE
If you are NOT provided with a PROJECT CONTEXT, you are in a general chat conversation.
- You CAN use create_artifact, write_file, read_file, edit_file, and write_to_plan to create artifacts or documents.
- You CANNOT use list_dir or grep_tool as there is no file system to search.

### ARTIFACT & FILE USAGE
For interactive previews (UI components, charts, slides, HTML pages, SVG graphics, tables, markdown docs), use \`create_artifact\` with the appropriate type and a descriptive title. Set \`path\` to auto-save to the project when working in project mode.
- Use \`create_artifact\` for: standalone components, full pages, data visualizations, presentations, documents.
- Use \`write_file\` for: saving files to disk that don't need immediate preview.
- Use inline code blocks for: short snippets (<15 lines), single functions, config examples, CLI commands.
- Always provide a descriptive title or filename.

### RESPONSE FORMAT
- Output clean, well-structured, professional markdown.
- Use proper headings, lists, and spacing. Do not ramble or repeat yourself.
- Be direct and decisive. Answer the user's question or complete the task in as few words as necessary.
- Do not add unnecessary commentary, apologies, or disclaimers.
- Group related information into clear sections.

### ALGORITHMIC RULES & SMART DIFF ENGINE
You MUST follow the algorithmic rules for tool usage and the Smart Diff Engine layer.
1. **Never trust memory**: Always re-read the target region before an \`edit_file\` call.
2. **Uniqueness Check**: Ensure \`target_content\` appears exactly once in the file before calling \`edit_file\`.
3. **Verify Post-Apply**: Re-read the file after an edit to verify the change was applied correctly.
4. **Edit vs Write**: Use \`edit_file\` for localized changes (<40% of file) and \`write_file\` for larger restructures or fresh files.
5. **Impact Mapping**: Use \`list_dir\` and \`grep_tool\` to plan multi-file changes before execution.
`;

export const readFileTool = {
  description: 'Read the contents of an existing file in the project workspace',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file from the project root (e.g., "src/App.tsx")' },
    },
    required: ['path'],
    additionalProperties: true,
  },
};

export const writeFileTool = {
  description:
    'Create a new file or completely overwrite an existing file in the project workspace',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file from the project root (e.g., "src/components/Card.tsx")' },
      content: { type: 'string', description: 'The complete content to write to the file' },
    },
    required: ['path', 'content'],
    additionalProperties: true,
  },
};

export const editFileTool = {
  description:
    'Edit a specific block of code in an existing file by replacing target_content with replacement_content',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file from the project root (e.g., "src/index.css")' },
      target_content: { type: 'string', description: 'The exact block of code to search for. Must match the file content exactly including whitespace.' },
      replacement_content: { type: 'string', description: 'The new code block to replace target_content' },
    },
    required: ['path', 'target_content', 'replacement_content'],
    additionalProperties: true,
  },
};

import { z } from 'zod';

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
