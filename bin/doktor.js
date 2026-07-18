#!/usr/bin/env node

import { cac } from 'cac';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'process';
import http from 'http';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

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

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const CHECK = `${Style.GREEN}✓${Style.RESET}`;
const CROSS = `${Style.RED}✗${Style.RESET}`;

const LOG_COLORS = { backend: Style.BLUE, frontend: Style.MAGENTA, crawl: Style.GREEN };
const LOG_PREFIX = { backend: '│ API │', frontend: '│ UI  │', crawl: '│CRAWL│' };
const MAX_LOG_LINES = 12;

const serviceLogs = { backend: [], frontend: [], crawl: [] };
let spinnerIndex = 0;
let spinnerInterval = null;
let logRenderInterval = null;
let servicesReady = { backend: false, frontend: false, crawl: false };
let serviceUrls = { backend: '', frontend: '', crawl: '' };

function printBanner() {
  console.log(`
${Style.MAGENTA}${Style.BOLD}
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║   ██████╗ ██████╗ ███████╗███╗   ██╗████████╗███████╗        ║
    ║   ██╔══██╗██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔════╝        ║
    ║   ██████╔╝██████╔╝█████╗  ██╔██╗ ██║   ██║   ███████╗        ║
    ║   ██╔═══╝ ██╔══██╗██╔══╝  ██║╚██╗██║   ██║   ╚════██║        ║
    ║   ██║     ██║  ██║███████╗██║ ╚████║   ██║   ███████║        ║
    ║   ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝        ║
    ║                                                              ║
    ║         ${Style.CYAN}AI Content Creation Agent${Style.MAGENTA}                     ║
    ║         ${Style.DIM}vite + react + effect.ts + go-crawl${Style.MAGENTA}              ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
${Style.RESET}
`);
}

function printDivider() {
  console.log(`  ${Style.GRAY}────────────────────────────────────────────────────────────${Style.RESET}`);
}

function startSpinner(label) {
  process.stdout.write(`  ${Style.CYAN}${FRAMES[0]}${Style.RESET} ${label}...`);
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % FRAMES.length;
    process.stdout.write(`\r  ${Style.CYAN}${FRAMES[spinnerIndex]}${Style.RESET} ${label}...`);
  }, 80);
}

function stopSpinner(success = true, label = '') {
  if (spinnerInterval) { clearInterval(spinnerInterval); spinnerInterval = null; }
  const mark = success ? CHECK : CROSS;
  process.stdout.write(`\r  ${mark} ${label}\n`);
}

function addLog(service, line) {
  const clean = line.trim().replace(/\x1b\[[0-9;]*m/g, '');
  if (!clean) return;
  const noise = ['HMR', 'connected', 'DevTools', '[webpack]', '[vite]', 'hmr:', '[HMR]', 'WebSocket', 'ws:', 'hot reload'];
  if (noise.some(n => clean.includes(n))) return;
  serviceLogs[service].push(clean.slice(0, 120));
  if (serviceLogs[service].length > MAX_LOG_LINES * 2) {
    serviceLogs[service] = serviceLogs[service].slice(-MAX_LOG_LINES);
  }
}

function renderLogPanel() {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\x1b[s');
  process.stdout.write('\x1b[999;1H');
  process.stdout.write('\x1b[2J');
  
  console.log(`\n  ${Style.BOLD}${Style.WHITE}Live Logs${Style.RESET} ${Style.DIM}(last ${MAX_LOG_LINES} lines)${Style.RESET}`);
  printDivider();
  
  for (const [name, logs] of Object.entries(serviceLogs)) {
    const color = LOG_COLORS[name];
    const prefix = LOG_PREFIX[name];
    const ready = servicesReady[name] ? `${Style.GREEN}●${Style.RESET}` : `${Style.YELLOW}◐${Style.RESET}`;
    const recent = logs.slice(-MAX_LOG_LINES);
    console.log(`  ${ready} ${Style.DIM}${prefix}${Style.RESET} ${color}${name}${Style.RESET}`);
    if (recent.length === 0) {
      console.log(`  ${Style.DIM}  (waiting...)${Style.RESET}`);
    } else {
      for (const line of recent) console.log(`  ${Style.DIM}  ${line}${Style.RESET}`);
    }
    console.log();
  }
  
  process.stdout.write('\x1b[u');
}

function startLogRenderer() {
  if (logRenderInterval) return;
  renderLogPanel();
  logRenderInterval = setInterval(renderLogPanel, 2000);
}

function stopLogRenderer() {
  if (logRenderInterval) { clearInterval(logRenderInterval); logRenderInterval = null; }
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

cli.command('serve', 'Start all services (frontend + backend + go-crawl)')
  .option('--frontend-port <port>', 'Frontend port', { default: '4028' })
  .option('--backend-port <port>', 'Backend port', { default: '3001' })
  .option('--crawl-port <port>', 'Go-crawl port', { default: '8080' })
  .action(async (options) => {
    process.stdout.write('\x1c');
    printBanner();

    const frontendPort = parseInt(options.frontendPort);
    const backendPort = parseInt(options.backendPort);
    const crawlPort = parseInt(options.crawlPort);

    serviceUrls = {
      frontend: `http://localhost:${frontendPort}`,
      backend: `http://localhost:${backendPort}`,
      crawl: `http://localhost:${crawlPort}`,
    };
    servicesReady = { frontend: false, backend: false, crawl: false };
    for (const k of Object.keys(serviceLogs)) serviceLogs[k] = [];

    const children = [];

    const cleanup = () => {
      stopLogRenderer();
      process.stdout.write(`\n${Style.YELLOW}◇ stopping all services${Style.RESET}\n`);
      children.forEach(c => { try { c.kill('SIGTERM'); } catch {} });
      setTimeout(() => process.exit(0), 500);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Start all services in parallel
    printDivider();
    console.log(`  ${Style.BOLD}${Style.WHITE}Starting Services${Style.RESET}`);
    printDivider();

    const [backendReady, frontendReady, crawlReady] = await Promise.all([
      // Backend
      (async () => {
        const tsx = join(ROOT, 'server', 'node_modules', '.bin', 'tsx');
        const backend = spawn(tsx, ['watch', '--env-file', 'server/.env', 'server/src/index.ts'], {
          cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, NODE_NO_WARNINGS: '1', FORCE_COLOR: '1', PORT: String(backendPort) },
          shell: process.platform === 'win32',
        });
        children.push(backend);

        backend.stdout?.on('data', data => {
          for (const line of data.toString().split('\n')) addLog('backend', line);
        });
        backend.stderr?.on('data', data => {
          for (const line of data.toString().split('\n')) addLog('backend', line);
        });

        try {
          await pollHTTP(backendPort, '/api/selftest/status', 90000);
          servicesReady.backend = true;
          return true;
        } catch { return false; }
      })(),

      // Frontend
      (async () => {
        const vite = join(ROOT, 'node_modules', '.bin', 'vite');
        const frontend = spawn(vite, ['--port', String(frontendPort), '--host'], {
          cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, NODE_NO_WARNINGS: '1', FORCE_COLOR: '1' },
          shell: process.platform === 'win32',
        });
        children.push(frontend);

        frontend.stdout?.on('data', data => {
          for (const line of data.toString().split('\n')) addLog('frontend', line);
        });
        frontend.stderr?.on('data', data => {
          for (const line of data.toString().split('\n')) addLog('frontend', line);
        });

        try {
          await pollPort(frontendPort, 90000);
          servicesReady.frontend = true;
          return true;
        } catch { return false; }
      })(),

      // Go-crawl
      (async () => {
        const crawlExe = join(ROOT, 'crawler', 'go-crawl.exe');
        const crawl = spawn(crawlExe, [], {
          cwd: join(ROOT, 'crawler'),
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, PORT: String(crawlPort) },
          shell: process.platform === 'win32',
        });
        children.push(crawl);

        crawl.stdout?.on('data', data => {
          for (const line of data.toString().split('\n')) addLog('crawl', line);
        });
        crawl.stderr?.on('data', data => {
          for (const line of data.toString().split('\n')) addLog('crawl', line);
        });

        try {
          await pollPort(crawlPort, 15000);
          servicesReady.crawl = true;
          return true;
        } catch { return false; }
      })(),
    ]);

    // Check results
    if (!backendReady || !frontendReady || !crawlReady) {
      console.log(`\n  ${CROSS} ${Style.RED}Some services failed to start${Style.RESET}`);
      cleanup();
      process.exit(1);
    }

    // All ready - show final URLs
    stopLogRenderer();
    printDivider();
    console.log(`
  ${Style.GREEN}${Style.BOLD}◇ All services running${Style.RESET}

  ${Style.BOLD}Frontend${Style.RESET}  ${Style.CYAN}→${Style.RESET}  ${Style.UNDERLINE}${serviceUrls.frontend}${Style.RESET}
  ${Style.BOLD}Backend${Style.RESET}   ${Style.CYAN}→${Style.RESET}  ${Style.UNDERLINE}${serviceUrls.backend}${Style.RESET}
  ${Style.BOLD}Go-crawl${Style.RESET}  ${Style.CYAN}→${Style.RESET}  ${Style.UNDERLINE}${serviceUrls.crawl}${Style.RESET}

  ${Style.DIM}Press Ctrl+C to stop all services${Style.RESET}
`);
    printDivider();

    // Start live log panel
    startLogRenderer();
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

cli.help();
cli.parse();

if (!cli.args.length) cli.outputHelp();