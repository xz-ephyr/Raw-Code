import { z } from 'zod';
import { tool } from 'ai';
import { FileSystemService } from '../../FileSystemService';
import { resolveProjectPath } from '../../../lib/projectPaths';

export const readFileTool = (projectPath?: string) => tool({
  description: 'Read the contents of an existing file in the project workspace',
  parameters: z.object({
    file_path: z
      .string()
      .describe('Relative path to the file from the project root (e.g., "src/App.tsx")'),
  }),
  // @ts-expect-error - dynamic tool execution
  execute: async ({ file_path }: { file_path: string }) => {
    if (!projectPath) return { error: 'Not in project mode.' };
    try {
      const fullPath = await resolveProjectPath(projectPath, file_path);
      if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
      const content = await FileSystemService.getFileContent(fullPath);
      return { content, file_path };
    } catch (e: any) {
      return { error: `Failed to read: ${e.message || e}` };
    }
  },
});
