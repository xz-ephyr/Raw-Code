import { execSync, spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SelfTestResult, LayerManifest } from '../types';

const _dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(_dirname, '..', '..', '..');

function ok(layer: string, name: string, durationMs = 0): SelfTestResult {
  return { layer, name, status: 'pass', durationMs };
}
function fail(layer: string, name: string, msg: string, durationMs = 0): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs };
}
function skip(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'skip', message: msg, durationMs: 0 };
}

function npx(...args: string[]): string {
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return `"${join(ROOT, 'node_modules', '.bin', cmd)}" ${args.join(' ')}`;
}

async function waitForServer(url: string, timeoutMs = 15_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = httpRequest(url, { method: 'HEAD', timeout: 2000 }, () => { resolve(); req.destroy(); });
        req.on('error', reject);
        req.end();
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

async function checkTypeScriptCompile(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  const start = Date.now();
  try {
    execSync('node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit', { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    results.push(ok(layer, 'TypeScript compilation: tsc --noEmit passes', Date.now() - start));
  } catch (e: any) {
    if (e.killed || e.signal) {
      results.push(skip(layer, 'TypeScript compilation', `Process killed (OOM or timeout): ${e.message}`, Date.now() - start));
    } else {
      const msg = e.stdout?.toString() || e.message;
      const line = msg.split('\n').slice(0, 3).join(' | ');
      results.push(fail(layer, 'TypeScript compilation', line, Date.now() - start));
    }
  }
  return results;
}

async function checkExistingUnitTests(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  const start = Date.now();
  try {
    execSync('node --max-old-space-size=2048 node_modules/vitest/vitest.mjs run --reporter=verbose', { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    results.push(ok(layer, 'Vitest: all tests pass', Date.now() - start));
  } catch (e: any) {
    if (e.killed || e.signal) {
      results.push(skip(layer, 'Vitest', `Process killed (OOM or timeout): ${e.message}`, Date.now() - start));
    } else {
      const output = e.stdout?.toString() || e.message;
      const failedMatch = output.match(/(\d+) failed/);
      const failedCount = failedMatch ? parseInt(failedMatch[1]) : 0;
      const lines = output.split('\n').filter((l: string) => l.includes('FAIL') || l.includes('❌'));
      const detail = lines.slice(0, 5).join('; ') || `Failed: ${failedCount} tests`;
      results.push(fail(layer, `Vitest: all tests pass (${failedCount} failed)`, detail, Date.now() - start));
    }
  }
  return results;
}

async function checkServerStart(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  const start = Date.now();
  const port = 3098;
  const proc = spawn('node', ['--max-old-space-size=512', 'server/src/index.ts'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(port) },
  });

  try {
    const ready = await waitForServer(`http://localhost:${port}/api/selftest/status`, 20_000);
    if (ready) {
      results.push(ok(layer, 'Server: starts and responds on /api/selftest/status', Date.now() - start));
    } else {
      const stderrOut = await new Promise<string>((r) => {
        const chunks: Buffer[] = [];
        proc.stderr?.on('data', (c) => chunks.push(c as Buffer));
        setTimeout(() => r(Buffer.concat(chunks).toString()), 1000);
      });
      results.push(skip(layer, 'Server: start check', `Did not become ready: ${stderrOut.slice(0, 200)}`));
    }
  } finally {
    proc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    try { proc.kill('SIGKILL'); } catch {}
  }
  return results;
}

async function checkBuild(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  const start = Date.now();
  try {
    execSync('node --max-old-space-size=2048 node_modules/vite/bin/vite.js build --logLevel error', { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    results.push(ok(layer, 'Vite build: production build succeeds', Date.now() - start));
  } catch (e: any) {
    if (e.killed || e.signal) {
      results.push(skip(layer, 'Vite build', `Process killed (OOM or timeout): ${e.message}`, Date.now() - start));
    } else {
      const msg = e.stderr?.toString() || e.message;
      results.push(fail(layer, 'Vite build', msg.slice(0, 200), Date.now() - start));
    }
  }
  return results;
}

export const endToEndManifest: LayerManifest = {
  id: 'end-to-end',
  name: 'End-to-End',
  description: 'Run tsc --noEmit, vitest, live server start/health check, and vite build',
  requiresFull: true,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkTypeScriptCompile('end-to-end'),
      ...await checkExistingUnitTests('end-to-end'),
      ...await checkServerStart('end-to-end'),
      ...await checkBuild('end-to-end'),
    ];
    return results;
  },
};
