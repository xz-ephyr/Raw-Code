import { z } from 'zod';
import { tool } from 'ai';

export const createArtifactTool = () => tool({
  description: 'Create or update an interactive artifact for user preview',
  parameters: z.object({
    type: z.enum(['react', 'html', 'markdown', 'chart', 'sheet', 'slides']),
    title: z.string().describe('Descriptive title for the artifact'),
    content: z.string().describe('The full content of the artifact or file code'),
    path: z
      .string()
      .optional()
      .describe('Relative path within the project (e.g., "src/components/Button.tsx")'),
    intent_message: z
      .string()
      .optional()
      .describe('A brief, human-readable status message about what you are creating.'),
  }),
  // @ts-expect-error - dynamic tool execution
  execute: async (args: any) => ({
    success: true,
    type: args.type || 'markdown',
    title: args.title || 'Untitled Artifact',
    content: args.content || '',
  }),
});
