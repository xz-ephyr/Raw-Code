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
    timeout: z.number().int().positive().max(300000).optional().default(30000).describe('Timeout in milliseconds (max 300,000).'),
  }),
  execute: async ({ command, cwd, timeout }) => {
    // Map cwd to workdir and convert timeout to seconds for the Go executor
    return callGoTool(
      'run_command',
      {
        command,
        workdir: cwd,
        timeout: Math.floor((timeout ?? 30000) / 1000)
      },
      { idempotent: false, timeout: (timeout ?? 30000) + 5000 }
    );
  },
};
