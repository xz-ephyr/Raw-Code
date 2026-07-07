import { z } from 'zod';
import type { ToolDef } from '@core/types';
import { callGoTool } from '@core/utils/goProxy';

export const runCommandTool: ToolDef = {
  name: 'run_command',
  description: 'Execute a shell command and return stdout, stderr, and exit code. Use PowerShell syntax. Always set cwd to the project root. Prefer npm scripts over raw tools. NEVER run destructive commands (rm -rf, format, mass delete) without explicit user approval.',
  category: 'system',
  inputSchema: z.object({
    command: z.string().describe('The full PowerShell command to execute. Use project npm scripts when available (npm run build, npm test). For multiple steps, chain with semicolons.'),
    cwd: z.string().optional().describe('Working directory. ALWAYS set this to the project root — never assume the default.'),
    timeout: z.number().int().positive().max(300000).optional().default(30000).describe('Timeout in ms. Quick checks: 10000. Package installs: 60000. Builds: 120000. Max: 300000.'),
  }),
  execute: async ({ command, cwd, timeout }) => {
    // Map cwd to workdir and convert timeout to seconds for the Go executor.
    // Clamp timeout to minimum 1s (1000ms) to avoid sub-second rounding to 0.
    const effectiveTimeoutMs = Math.max(timeout ?? 30000, 1000);
    return callGoTool(
      'run_command',
      {
        command,
        workdir: cwd,
        timeout: Math.floor(effectiveTimeoutMs / 1000)
      },
      { idempotent: false, timeout: effectiveTimeoutMs + 5000 }
    );
  },
};
