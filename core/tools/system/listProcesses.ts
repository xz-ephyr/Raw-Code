import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const listProcessesTool: ToolDef = {
  name: 'list_processes',
  description: 'List currently running system processes.',
  category: 'system',
  inputSchema: z.object({}),
  execute: async () => {
    return callGoTool('list_processes', {});
  },
};
