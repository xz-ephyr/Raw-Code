import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { callGoTool } from '@core/utils/goProxy';
import { requestToolConfirmation } from '@core/utils/toolConfirm';

export const runCommandTool = {
  name: 'run_command',
  ...tool({
    description: 'Execute a shell command and return stdout, stderr, and exit code. Use PowerShell syntax. Always set cwd to the project root. Prefer npm scripts over raw tools. NEVER run destructive commands (rm -rf, format, mass delete) without explicit user approval.',
    inputSchema: zodSchema(z.object({
      command: z.string().describe('The full PowerShell command to execute. Use project npm scripts when available (npm run build, npm test). For multiple steps, chain with semicolons.'),
      cwd: z.string().optional().describe('Working directory. ALWAYS set this to the project root — never assume the default.'),
      timeout: z.number().int().positive().max(300000).optional().default(30000).describe('Timeout in ms. Quick checks: 10000. Package installs: 60000. Builds: 120000. Max: 300000.'),
    })),
    execute: async ({ command, cwd, timeout }) => {
      const confirmResult = await requestToolConfirmation(
        'run_command',
        `Run command: ${command.slice(0, 200)}${command.length > 200 ? '...' : ''}`,
        { command, cwd, timeout }
      );
      if (confirmResult.denied) {
        return { denied: true, message: confirmResult.message || 'User denied this action' };
      }
      const effectiveTimeoutMs = Math.max(timeout ?? 30000, 1000);
      return callGoTool(
        'run_command',
        {
          command,
          workdir: cwd,
          confirm: true,
          timeout: Math.floor(effectiveTimeoutMs / 1000)
        },
        { idempotent: false, timeout: effectiveTimeoutMs + 5000 }
      );
    },
  }),
};
