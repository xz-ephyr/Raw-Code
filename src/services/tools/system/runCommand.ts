import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const runCommandTool: ToolDef = {
  name: 'run_command',
  description: 'Execute a shell command and return the stdout, stderr, and exit code.',
  category: 'system',
  inputSchema: z.object({
    command: z.string().describe('The full shell command to execute.'),
    cwd: z.string().optional().describe('The working directory to run the command in.'),
    timeout: z.number().optional().default(30000).describe('Timeout in milliseconds.'),
  }),
  execute: async ({ command, cwd, timeout }) => {
    return callGoTool('run_command', { command, cwd, timeout });
  },
};
