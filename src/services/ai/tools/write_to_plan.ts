import { z } from 'zod';
import { tool } from 'ai';
import { FileSystemService } from '../../FileSystemService';
import { resolveProjectPath } from '../../../lib/projectPaths';

export const writeToPlanTool = (projectPath?: string) => tool({
  description: 'Write or update a project plan or checklist in plan.md or todo.md',
  parameters: z.object({
    filename: z
      .enum(['plan.md', 'todo.md'])
      .describe('The plan file to write to (plan.md or todo.md)'),
    content: z.string().describe('The complete markdown content of the plan and todo checklist'),
  }),
  // @ts-expect-error - dynamic tool execution
  execute: async ({ filename, content }: { filename: string; content: string }) => {
    if (projectPath) {
      try {
        const fullPath = await resolveProjectPath(projectPath, filename);
        if (!fullPath) return { error: `Path escapes project: ${filename}.` };
        await FileSystemService.saveFile(fullPath, content);
        return { success: true, filename, content };
      } catch (e: any) {
        return { error: `Failed to write plan: ${e.message || e}` };
      }
    }
    return { success: true, is_artifact: true, title: filename, content };
  },
});
