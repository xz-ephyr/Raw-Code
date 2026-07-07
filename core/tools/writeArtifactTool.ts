import { tool, zodSchema } from 'ai';
import { z } from 'zod';

export const writeArtifactTool = tool({
  description: 'Create or update an interactive preview artifact: code, HTML, SVG, Mermaid diagram, React component, or markdown document. Use for substantial content (>15 lines). Reuse the same identifier to update an existing artifact. One artifact per message unless asked otherwise.',
  inputSchema: zodSchema(z.object({
    identifier: z.string().describe('Unique kebab-case identifier for the artifact. Reuse to update an existing artifact.'),
    type: z.enum(['code', 'html', 'react', 'svg', 'mermaid', 'markdown']).describe('The type of artifact.'),
    title: z.string().describe('Human-readable title for the artifact.'),
    language: z.string().optional().describe('Programming language for code artifacts (e.g. "python", "typescript").'),
    content: z.string().describe('The full content of the artifact.'),
  })),
  execute: async ({ identifier, type, title, language, content }) => {
    return { identifier, type, title, language, content };
  },
});
