import { z } from 'zod';
import { tool } from 'ai';
import { FileSystemService } from '../../FileSystemService';
import { resolveProjectPath } from '../../../lib/projectPaths';

export const writeFileTool = (projectPath?: string) => tool({
  description: 'Create a new file or completely overwrite an existing file in the project workspace',
  parameters: z.object({
    file_path: z
      .string()
      .describe(
        'Relative path to the file from the project root (e.g., "src/components/Card.tsx")'
      ),
    content: z.string().describe('The complete content to write to the file'),
  }),
  // @ts-expect-error - dynamic tool execution
  execute: async ({ file_path, content }: { file_path: string; content: string }) => {
    if (!projectPath) {
      return { error: 'Not in project mode. Cannot write files to disk.' };
    }
    try {
      const fullPath = await resolveProjectPath(projectPath, file_path);
      if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
      await FileSystemService.saveFile(fullPath, content);
      return { success: true, file_path, content };
    } catch (e: any) {
      return { error: `Failed to write: ${e.message || e}` };
    }
  },
});
