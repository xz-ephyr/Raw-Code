import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const listProcessesTool: ToolDef = {
  name: 'list_processes',
  description: 'List currently running system processes.',
  category: 'system',
  inputSchema: z.object({}),
  execute: async () => {
    return callGoTool('list_processes', {});
  },
};
