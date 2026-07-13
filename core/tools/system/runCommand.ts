import { Effect, Schema } from 'effect';
import { make } from '@doktor/tool-runtime';

const inputSchema = Schema.Struct({
  command: Schema.String,
  cwd: Schema.optional(Schema.String),
  timeout: Schema.optional(Schema.Number),
});

const outputSchema = Schema.Struct({
  stdout: Schema.String,
  stderr: Schema.String,
  exitCode: Schema.Number,
});

export const runCommandTool = make({
  description: 'Execute a shell command and return stdout, stderr, and exit code. Use PowerShell syntax on Windows. Always set cwd to the project root.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The full PowerShell command to execute' },
      cwd: { type: 'string', description: 'Working directory (defaults to project root)' },
      timeout: { type: 'number', description: 'Timeout in ms (max 300000)' },
    },
    required: ['command'],
  },
  execute: (input) =>
    Effect.tryPromise({
      try: () => new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
        const timeout = input.timeout ?? 30000;
        const cwd = input.cwd ?? process.cwd();

        const child = require('child_process').spawn('powershell.exe', ['-Command', input.command], {
          cwd,
          shell: true,
          timeout,
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

        child.on('close', (code: number | null) => {
          resolve({ stdout, stderr, exitCode: code ?? 1 });
        });
        child.on('error', (err: Error) => reject(err));
      }),
      catch: (err) => new Error(`Command execution failed: ${err instanceof Error ? err.message : String(err)}`),
    }),
});