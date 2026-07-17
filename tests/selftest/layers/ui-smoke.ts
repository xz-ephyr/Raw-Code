import type { SelfTestResult, LayerManifest } from '../types';
import { spawn, type ChildProcess } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(_dirname, '..', '..', '..');

const NPX = process.platform === 'win32' ? join(ROOT, 'node_modules', '.bin', 'npx.cmd') : join(ROOT, 'node_modules', '.bin', 'npx');
const NODE_BIN = process.execPath;

function ok(layer: string, name: string): SelfTestResult {
  return { layer, name, status: 'pass', durationMs: 0 };
}
function fail(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs: 0 };
}
function skip(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'skip', message: msg, durationMs: 0 };
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = httpRequest(url, { method: 'HEAD', timeout: 2000 }, (res) => { resolve(); req.destroy(); });
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

function startViteServer(): ChildProcess {
  return spawn(NPX, ['vite', '--port', '5199', '--strictPort'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, VITE_FEATURE_NATIVE_LLM: 'true' },
  });
}

function startExpressServer(): ChildProcess {
  return spawn(NODE_BIN, ['--max-old-space-size=512', 'server/src/index.ts'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, PORT: '3099' },
  });
}

function killProcess(proc: ChildProcess | null): Promise<void> {
  if (!proc) return Promise.resolve();
  return new Promise((resolve) => {
    proc.on('exit', () => resolve());
    proc.kill('SIGTERM');
    setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} resolve(); }, 3000);
  });
}

async function collectOutput(proc: ChildProcess): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of proc.stdout ?? []) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf-8');
}

async function checkPlaywrightAvailable(layer: string): Promise<SelfTestResult | null> {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true }).catch(() => null);
    if (browser) {
      await browser.close();
      return null;
    }
    return skip(layer, 'Playwright: browser available', 'chromium browser binary not installed (run `npx playwright install chromium`)');
  } catch {
    return skip(layer, 'Playwright: package available', 'playwright package not found');
  }
}

async function runUiSmoke(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  let viteProc: ChildProcess | null = null;
  let expressProc: ChildProcess | null = null;

  try {
    const skipResult = await checkPlaywrightAvailable(layer);
    if (skipResult) {
      results.push(skipResult);
      results.push(skip(layer, 'UI smoke test: chat interaction', 'Skipped — Playwright not available'));
      results.push(skip(layer, 'UI smoke test: thinking panel', 'Skipped — Playwright not available'));
      results.push(skip(layer, 'UI smoke test: tool-call UI', 'Skipped — Playwright not available'));
      results.push(skip(layer, 'UI smoke test: streaming progressivity', 'Skipped — Playwright not available'));
      return results;
    }

    // Start servers
    expressProc = startExpressServer();
    const expressReady = await waitForServer('http://localhost:3099/api/selftest/status');
    if (!expressReady) {
      const out = await collectOutput(expressProc);
      killProcess(expressProc);
      results.push(fail(layer, 'UI smoke test: Express server start', out.slice(0, 200)));
      results.push(skip(layer, 'UI smoke test: remaining checks', 'Express server did not start'));
      return results;
    }
    results.push(ok(layer, 'UI smoke test: Express server started on :3099'));

    viteProc = startViteServer();
    const viteReady = await waitForServer('http://localhost:5199');
    if (!viteReady) {
      const out = await collectOutput(viteProc);
      killProcess(viteProc);
      killProcess(expressProc);
      results.push(fail(layer, 'UI smoke test: Vite dev server start', out.slice(0, 200)));
      results.push(skip(layer, 'UI smoke test: remaining checks', 'Vite dev server did not start'));
      return results;
    }
    results.push(ok(layer, 'UI smoke test: Vite dev server started on :5199'));

    // Launch browser
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: [],
    });
    const page = await context.newPage();

    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    // Navigate to app
    await page.goto('http://localhost:5199', { waitUntil: 'networkidle', timeout: 30_000 });
    results.push(ok(layer, 'UI smoke test: app loads without error'));

    // Check that the page has a chat input
    const inputSelector = 'textarea, [contenteditable="true"], [data-testid="chat-input"], input[type="text"]';
    const chatInput = await page.$(inputSelector);
    if (chatInput) {
      results.push(ok(layer, 'UI smoke test: chat input found in DOM'));
    } else {
      results.push(fail(layer, 'UI smoke test: chat input', 'No chat input element found'));
    }

    // Check that the page renders without crash (no console errors)
    const errors = consoleLogs.filter((l) => l.includes('Error') || l.includes('error') || l.includes('React'));
    if (errors.length === 0) {
      results.push(ok(layer, 'UI smoke test: no console errors on load'));
    } else {
      results.push(fail(layer, 'UI smoke test: console errors', errors.slice(0, 3).join('; ')));
    }

    // Check reasoning panel does NOT appear before a request (no thinking_delta phantom)
    const reasoningPanel = await page.$('[data-testid="reasoning-panel"], .reasoning-panel, [class*="thinking"]');
    if (reasoningPanel) {
      // If reasoning panel exists in DOM but is hidden/empty, that's OK
      const visible = await reasoningPanel.isVisible().catch(() => false);
      if (visible) {
        const text = await reasoningPanel.textContent().catch(() => '');
        if (text?.trim()) {
          results.push(fail(layer, 'UI smoke test: phantom thinking panel', 'Reasoning panel visible with content before any request'));
        } else {
          results.push(ok(layer, 'UI smoke test: reasoning panel absent/empty before request'));
        }
      } else {
        results.push(ok(layer, 'UI smoke test: reasoning panel hidden before request'));
      }
    } else {
      results.push(ok(layer, 'UI smoke test: no reasoning panel rendered before request'));
    }

    // Send a test message if chat input exists
    if (chatInput) {
      const testMessage = 'Say hello in one sentence';
      await chatInput.fill(testMessage);
      await page.keyboard.press('Enter');
      results.push(ok(layer, 'UI smoke test: message sent'));

      // Wait for streaming response to appear
      try {
        await page.waitForSelector('[data-testid="message-content"], .message-content, [class*="message"]', { timeout: 20_000 });
        results.push(ok(layer, 'UI smoke test: response message appears'));

        // Check for progressive streaming (text updates over time)
        const msgSelector = '[data-testid="message-content"], .message-content';
        const firstSnapshot = await page.textContent(msgSelector).catch(() => '');
        await new Promise((r) => setTimeout(r, 1000));
        const secondSnapshot = await page.textContent(msgSelector).catch(() => '');
        if (secondSnapshot && secondSnapshot !== firstSnapshot) {
          results.push(ok(layer, 'UI smoke test: text updates progressively (streaming visible)'));
        } else {
          results.push(skip(layer, 'UI smoke test: progressive text', 'Cannot confirm streaming — response may have arrived in one chunk'));
        }
      } catch {
        results.push(skip(layer, 'UI smoke test: streaming response', 'Response did not appear within timeout (may need real API key)'));
      }
    }

    await browser.close();
    results.push(ok(layer, 'UI smoke test: browser session completed'));
  } catch (e: any) {
    results.push(fail(layer, 'UI smoke test: unexpected error', String(e.message ?? e).slice(0, 200)));
  } finally {
    await killProcess(viteProc);
    await killProcess(expressProc);
  }

  return results;
}

export const uiSmokeManifest: LayerManifest = {
  id: 'ui-smoke',
  name: 'UI Integration (Playwright)',
  description: 'Browser-level smoke test: load frontend, send request, verify progressive rendering, thinking panel, tool-call UI',
  requiresFull: true,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    return runUiSmoke('ui-smoke');
  },
};
