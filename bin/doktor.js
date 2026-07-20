#!/usr/bin/env node

import { cac } from 'cac';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, createWriteStream, mkdirSync, existsSync, watchFile, createReadStream } from 'fs';
import process from 'process';
import http from 'http';
import net from 'net';

// Suppress the noisy DEP0190 (shell:true + args) — not actionable for the user
const _emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, type, code, ...rest) => {
  if (code === 'DEP0190') return;
  return _emitWarning(warning, type, code, ...rest);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

const Style = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m',
  UNDERLINE: '\x1b[4m',
};

const CHECK = `${Style.GREEN}✓${Style.RESET}`;
const CROSS = `${Style.RED}✗${Style.RESET}`;

function printBanner() {
  console.log(`${Style.BOLD}◇  DokTor${Style.RESET} ${Style.DIM}v${pkg.version}${Style.RESET}`);
}

function printDivider() {
  console.log(`  ${Style.GRAY}────────────────────────────────────────────────────────────${Style.RESET}`);
}

function addLog(service, line) {
  if (service !== 'crawl') return;
  const clean = line.trim().replace(/\x1b\[[0-9;]*m/g, '');
  if (!clean) return;
  const noise = ['HMR', 'connected', 'DevTools', '[webpack]', '[vite]', 'hmr:', '[HMR]', 'WebSocket', 'ws:', 'hot reload'];
  if (noise.some(n => clean.includes(n))) return;
  if (!process.stdout.isTTY) return;
  console.log(`  ${clean.slice(0, 120)}`);
}

function pollPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => {
        if (Date.now() - start > timeout) reject(new Error(`Port ${port} timeout`));
        else { socket.destroy(); setTimeout(check, 300); }
      });
      socket.connect(port, '127.0.0.1');
    };
    check();
  });
}

function pollHTTP(port, path, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET', timeout: 1000 });
      req.on('error', () => {
        if (Date.now() - start > timeout) reject(new Error(`HTTP ${port}${path} timeout`));
        else setTimeout(check, 300);
      });
      req.on('response', res => {
        res.on('data', () => {});
        res.on('end', () => { if (res.statusCode === 200) resolve(true); else setTimeout(check, 300); });
      });
      req.end();
    };
    check();
  });
}

async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd || ROOT,
      stdio: options.stdio || 'pipe',
      env: { ...process.env, ...options.env },
      shell: process.platform === 'win32',
    });
    if (options.onOutput) {
      child.stdout?.on('data', d => options.onOutput(d.toString(), 'stdout'));
      child.stderr?.on('data', d => options.onOutput(d.toString(), 'stderr'));
    }
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
    child.on('error', reject);
    if (options.detached) { child.unref(); resolve(child); }
  });
}

const cli = cac('doktor');

cli.command('serve', 'Start all services (frontend + backend)')
  .allowUnknownOptions()
  .action(async (options) => {
    const frontendPort = parseInt(options.frontendPort || process.env.FRONTEND_PORT || '4028');
    const backendPort = parseInt(options.backendPort || process.env.BACKEND_PORT || '3001');

    const LOG_DIR = join(ROOT, 'logs');
    mkdirSync(LOG_DIR, { recursive: true });

    const svcs = [
      { name: 'Backend',  color: Style.GREEN,  log: createWriteStream(join(LOG_DIR, 'backend.log'),  { flags: 'a' }) },
      { name: 'Frontend', color: Style.BLUE,   log: createWriteStream(join(LOG_DIR, 'frontend.log'), { flags: 'a' }) },
    ];

    process.stdout.write(`${Style.BOLD}◇  DokTor${Style.RESET} ${Style.DIM}v${pkg.version}${Style.RESET}\n\n`);

    const SPINNER = ['◐', '◓', '◑', '◒'];
    let sFrame = 0;
    const status = svcs.map(() => null);

    function statusLine() {
      const parts = svcs.map((s, i) => {
        if (status[i] === true) return `${Style.GREEN}✓${Style.RESET} ${s.name}`;
        if (status[i] === false) return `${Style.RED}✗${Style.RESET} ${s.name}`;
        return `${s.color}${SPINNER[sFrame % SPINNER.length]}${Style.RESET} ${s.name}`;
      });
      const pending = status.some(s => s === null);
      const tail = pending ? `${Style.DIM}[connecting...]${Style.RESET}` : '';
      return `  ${parts.join('  ')}  ${tail}`;
    }

    process.stdout.write(statusLine());
    const spinTimer = setInterval(() => {
      sFrame++;
      process.stdout.write(`\r${statusLine()}`);
    }, 200);

    function logStatus(index, ok) {
      status[index] = ok;
      process.stdout.write(`\r${statusLine()}\n`);
    }

    const children = [];
    const cleanup = () => {
      console.log(`\n${Style.YELLOW}◇ stopping all services${Style.RESET}\n`);
      children.forEach(c => { try { c.kill(); } catch {} });
      setTimeout(() => process.exit(0), 500);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    function onExit(index, code) { if (code !== 0) logStatus(index, false); }

    await Promise.all([
      (async () => {
        const tsx = join(ROOT, 'server', 'node_modules', '.bin', 'tsx');
        const backend = spawn(tsx, ['watch', '--env-file', 'server/.env', 'server/src/index.ts'], {
          cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, NODE_NO_WARNINGS: '1', PORT: String(backendPort) },
          shell: process.platform === 'win32',
        });
        children.push(backend);
        backend.stdout?.pipe(svcs[0].log);
        backend.stderr?.pipe(svcs[0].log);
        backend.on('error', () => logStatus(0, false));
        backend.on('exit', (code) => onExit(0, code));
        try { await pollHTTP(backendPort, '/api/selftest/status', 90000); logStatus(0, true); } catch { logStatus(0, false); }
      })(),

      (async () => {
        const vite = join(ROOT, 'node_modules', '.bin', 'vite');
        const frontend = spawn(vite, ['--port', String(frontendPort), '--host'], {
          cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
          shell: process.platform === 'win32',
        });
        children.push(frontend);
        frontend.stdout?.pipe(svcs[1].log);
        frontend.stderr?.pipe(svcs[1].log);
        frontend.on('error', () => logStatus(1, false));
        frontend.on('exit', (code) => onExit(1, code));
        try { await pollPort(frontendPort, 90000); logStatus(1, true); } catch { logStatus(1, false); }
      })(),
    ]);

    clearInterval(spinTimer);
    process.stdout.write(`\n  ${Style.GREEN}${Style.BOLD}→${Style.RESET} ${Style.UNDERLINE}http://localhost:${frontendPort}${Style.RESET}\n\n`);

    await new Promise(() => {});
  });

cli.command('dev', 'Alias for serve').action(() => cli.parse(['serve']));

cli.command('build', 'Build for production').action(async () => {
  printBanner();
  console.log(`  ${Style.BOLD}Building...${Style.RESET}\n`);
  await runCommand('npm', ['run', 'build'], { stdio: 'inherit' });
  console.log(`\n  ${CHECK} ${Style.GREEN}Build complete${Style.RESET}\n`);
});

cli.command('test', 'Run self-test suite')
  .option('--full', 'Run full suite (includes API-dependent tests)')
  .option('--layer <layer>', 'Run specific layer (repeatable)', { default: [] })
  .action(async (options) => {
    printBanner();
    const args = ['tests/selftest/run.ts'];
    if (options.full) args.push('--full');
    if (options.layer?.length) {
      for (const l of options.layer) args.push('--layer', l);
    }
    await runCommand('tsx', args, { stdio: 'inherit' });
  });

cli.command('db <cmd>', 'Database utilities')
  .action(async (cmd) => {
    printBanner();
    if (cmd === 'studio') await runCommand('npx', ['drizzle-kit', 'studio'], { cwd: join(ROOT, 'server'), stdio: 'inherit' });
    else if (cmd === 'push') await runCommand('npx', ['drizzle-kit', 'push'], { cwd: join(ROOT, 'server'), stdio: 'inherit' });
    else {
      console.log(`  ${Style.YELLOW}Unknown command: ${cmd}${Style.RESET}`);
      console.log(`  ${Style.DIM}Available: studio, push${Style.RESET}`);
    }
  });

cli.command('doctor', 'Run health checks on all services')
  .action(async () => {
    printBanner();
    console.log(`  ${Style.BOLD}Running health checks...${Style.RESET}\n`);
    const checks = [
      { name: 'Backend API', check: () => pollHTTP(3001, '/api/selftest/status', 5000) },
      { name: 'Frontend', check: () => pollPort(4028, 5000) },
      { name: 'Go-crawl', check: () => pollPort(8080, 5000) },
    ];
    for (const { name, check } of checks) {
      process.stdout.write(`  ${Style.CYAN}◐${Style.RESET} ${name}...`);
      try { await check(); process.stdout.write(`\r  ${CHECK} ${name} ${Style.GREEN}OK${Style.RESET}\n`); }
      catch { process.stdout.write(`\r  ${CROSS} ${name} ${Style.RED}FAIL${Style.RESET}\n`); }
    }
    console.log();
  });

cli.command('logs <service>', 'Tail logs from a running service')
  .action(async (service) => {
    const valid = ['backend', 'frontend', 'crawl'];
    if (!valid.includes(service)) {
      console.log(`  ${Style.RED}Unknown service: ${service}${Style.RESET}`);
      console.log(`  ${Style.DIM}Available: ${valid.join(', ')}${Style.RESET}`);
      process.exit(1);
    }
    const logFile = join(ROOT, 'logs', `${service}.log`);
    if (!existsSync(logFile)) {
      console.log(`  ${CROSS} ${Style.RED}No logs found for ${service}${Style.RESET}`);
      console.log(`  ${Style.DIM}Run 'doktor serve' first, then try again${Style.RESET}`);
      process.exit(1);
    }
    console.log(`${Style.DIM}Tailing ${service} logs...${Style.RESET}\n`);

    const data = readFileSync(logFile, 'utf-8');
    if (data) process.stdout.write(data.replace(/\n$/, '') + '\n');

    let size = data.length;
    watchFile(logFile, { interval: 500 }, (curr) => {
      if (curr.size > size) {
        const stream = createReadStream(logFile, { start: size, encoding: 'utf-8' });
        stream.on('data', (chunk) => process.stdout.write(chunk));
        size = curr.size;
      }
    });

    await new Promise(() => {});
  });

cli.help();
cli.parse();

if (!cli.args.length && !cli.matchedCommand) cli.outputHelp();