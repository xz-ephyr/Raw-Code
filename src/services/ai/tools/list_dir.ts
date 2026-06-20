import { z } from 'zod';
import { tool } from 'ai';
import { FileSystemService } from '../../FileSystemService';
import { resolveProjectPath } from '../../../lib/projectPaths';

export const listDirTool = (projectPath?: string) => tool({
  description: 'List the contents of a directory in the project workspace',
  parameters: z.object({
    directory_path: z
      .string()
      .describe('Relative path to the directory from the project root (e.g., "src/components")'),
  }),
  // @ts-expect-error - dynamic tool execution
  execute: async ({ directory_path }: { directory_path: string }) => {
    if (!projectPath) return { error: 'Not in project mode.' };
    try {
      const fullPath = await resolveProjectPath(projectPath, directory_path);
      if (!fullPath) return { error: `Path escapes project: ${directory_path}.` };
      const entries = await FileSystemService.getTree(fullPath, 0);
      const summary = entries.map(e => `${e.name}${e.isDirectory ? '/' : ''}`).join('\n');
      return { entries: summary, directory_path };
    } catch (e: any) {
      return { error: `Failed to list directory: ${e.message || e}` };
    }
  },
});
