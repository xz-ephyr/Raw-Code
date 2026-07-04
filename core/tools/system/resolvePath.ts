import { z } from 'zod';
import type { ToolDef } from '@core/types';

export const resolvePathTool: ToolDef = {
  name: 'resolve_path',
  description: 'Resolve a file path, expanding environment variables, tilde (~), and normalizing separators.',
  category: 'system',
  inputSchema: z.object({
    path: z.string().describe('The path to resolve. Supports ~ for home directory and $VAR or %VAR% for environment variables.'),
  }),
  execute: async ({ path }) => {
    let resolved = path;

    if (resolved.startsWith('~')) {
      resolved = resolved.replace(/^~(?=$|\/|\\)/, '');
    }

    resolved = resolved.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_: string, name: string) => {
      try {
        return import.meta.env[`VITE_${name}`] || `$${name}`;
      } catch {
        return `$${name}`;
      }
    });

    resolved = resolved.replace(/%([A-Z_][A-Z0-9_]*)%/g, (_: string, name: string) => {
      try {
        return import.meta.env[`VITE_${name}`] || `%${name}%`;
      } catch {
        return `%${name}%`;
      }
    });

    const normalized = resolved.replace(/\\/g, '/');
    return { original: path, resolved: normalized };
  },
};
