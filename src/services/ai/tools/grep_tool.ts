import { z } from 'zod';
import { tool } from 'ai';
import { FileSystemService } from '../../FileSystemService';
import { resolveProjectPath } from '../../../lib/projectPaths';

export const grepTool = (projectPath?: string) => tool({
  description: 'Search for a pattern in files within the project workspace',
  parameters: z.object({
    pattern: z.string().describe('The search pattern (regex-like)'),
    directory_path: z
      .string()
      .optional()
      .describe('Optional relative path to search within (e.g., "src"). Defaults to project root.'),
  }),
  // @ts-expect-error - dynamic tool execution
  execute: async ({ pattern, directory_path }: { pattern: string; directory_path?: string }) => {
    if (!projectPath) return { error: 'Not in project mode.' };
    try {
      const searchDir = directory_path
        ? await resolveProjectPath(projectPath, directory_path)
        : projectPath;

      if (!searchDir) return { error: `Path escapes project: ${directory_path}.` };

      const allFiles: string[] = [];
      const collectFiles = async (path: string, depth = 0) => {
        if (depth > 20) return; // Deeper exploration
        const tree = await FileSystemService.getTree(path);
        for (const entry of tree) {
          if (entry.isDirectory) {
            if (entry.name.match(/^(\.git|node_modules|dist|build|target|out)$/i)) continue;
            await collectFiles(entry.path, depth + 1);
          } else {
            // Ignore binary files and node_modules
            if (!entry.name.match(/\.(png|jpg|jpeg|gif|pdf|zip|tar|gz|exe|dll|so|node|lock|pyc)$/i)) {
              allFiles.push(entry.path);
            }
          }
          if (allFiles.length > 5000) break;
        }
      };

      await collectFiles(searchDir);

      const results: { file_path: string; matches: string[] }[] = [];
      const regex = new RegExp(pattern, 'i');

      for (const filePath of allFiles) {
        let content = '';
        try {
          content = await FileSystemService.getFileContent(filePath);
        } catch (e) {
          console.error(`Failed to read ${filePath} during grep:`, e);
          continue;
        }

        if (content.length > 500000) continue;

        const lines = content.split('\n');
        const matches = lines.filter(line => regex.test(line));
        if (matches.length > 0) {
          const relativePath = filePath.replace(projectPath, '').replace(/^[\\/]/, '');
          results.push({ file_path: relativePath, matches: matches.slice(0, 20) });
        }
        if (results.length >= 100) break;
      }

      return { results };
    } catch (e: any) {
      return { error: `Grep failed: ${e.message || e}` };
    }
  },
});
