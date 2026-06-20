import { z } from 'zod';
import { tool } from 'ai';
import { FileSystemService } from '../../FileSystemService';
import { resolveProjectPath } from '../../../lib/projectPaths';

export const editFileTool = (projectPath?: string) => tool({
  description: 'Edit a specific block of code in an existing file by replacing target_content with replacement_content',
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
  // @ts-expect-error - dynamic tool execution
  execute: async ({
    file_path,
    target_content,
    replacement_content,
  }: {
    file_path: string;
    target_content: string;
    replacement_content: string;
  }) => {
    if (!projectPath) return { error: 'Not in project mode.' };
    try {
      const fullPath = await resolveProjectPath(projectPath, file_path);
      if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
      const currentContent = await FileSystemService.getFileContent(fullPath);

      if (!target_content) {
        return { error: 'target_content cannot be empty.' };
      }

      const occurrences = currentContent.split(target_content).length - 1;
      if (occurrences === 0) {
        return { error: `Target content not found in ${file_path}.` };
      }
      if (occurrences > 1) {
        return { error: `Target content found ${occurrences} times in ${file_path}. Please provide a unique block.` };
      }

      const updatedContent = currentContent.replace(target_content, replacement_content);
      await FileSystemService.saveFile(fullPath, updatedContent);
      return { success: true, file_path, content: updatedContent };
    } catch (e: any) {
      return { error: `Failed to edit: ${e.message || e}` };
    }
  },
});
