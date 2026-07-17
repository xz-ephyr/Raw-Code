#!/usr/bin/env node

process.env.NODE_NO_WARNINGS = '1';

import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { cac } from 'cac';

const binDir = new URL('../', import.meta.url);
const tsx = fileURLToPath(new URL('server/node_modules/.bin/tsx.cmd', binDir));
const vite = fileURLToPath(new URL('node_modules/.bin/vite.cmd', binDir));

const Style = {
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  DIM: "\x1b[90m",
  RED: "\x1b[91m",
  GREEN: "\x1b[92m",
  YELLOW: "\x1b[93m",
  CYAN: "\x1b[96m",
};

const LOGO = `
${Style.CYAN}${Style.BOLD}doktor${Style.RESET} ${Style.DIM}dev${Style.RESET}
`;

function pollPort(port, label, timeoutMs = 20000) {
  const frames = [' ◇', ' ◇', '◇ ', ' ◇'];
  const dots = ['·', '·', '·'];
  let i = 0;

  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      clearInterval(s);
      reject(new Error(`${label} timed out on port ${port}`));
    }, timeoutMs);

    process.stdout.write(`  ◇ ${label}`);

    const s = setInterval(() => {
      const frame = `${Style.YELLOW}${frames[i++ % frames.length]}${Style.RESET}`;
      process.stdout.write(`\r  ${frame} ${label}`);
    }, 150);

    const c = setInterval(() => {
      const r = http.get(`http://localhost:${port}`, () => {
        r.destroy();
        clearInterval(c); clearInterval(s); clearTimeout(t);
        process.stdout.write(`\r  ${Style.GREEN}◇${Style.RESET} ${label}  ${Style.DIM}${port}${Style.RESET}\n`);
        resolve();
      });
      r.on('error', () => r.destroy());
    }, 500);
  });
}

function startProcess(cmd, args) {
  const child = spawn('cmd.exe', ['/c', cmd, ...args], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, NODE_NO_WARNINGS: '1', FORCE_COLOR: '1' }
  });
  child.stdout.on('data', () => {});
  child.on('error', () => {});
  return child;
}

const cli = cac('doktor');

cli.command('serve', 'Start development environment')
  .action(async () => {
    process.stdout.write('\x1c');
    process.stdout.write(LOGO);

    const children = [];

    const cleanup = () => {
      process.stdout.write(`\n${Style.YELLOW}◇ stopping${Style.RESET}\n`);
      children.forEach(c => { try { c.kill('SIGTERM'); } catch {} });
      setTimeout(() => process.exit(0), 1000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    try {
      const server = startProcess(tsx, ['watch', '--env-file', 'server/.env', 'server/src/index.ts']);
      children.push(server);
      await pollPort(3001, 'backend');

      const frontend = startProcess(vite, []);
      children.push(frontend);
      await pollPort(4028, 'frontend');

      process.stdout.write(`\n  ${Style.GREEN}ready${Style.RESET}  ${Style.CYAN}http://localhost:4028${Style.RESET}  ${Style.DIM}ctrl+c to stop${Style.RESET}\n\n`);
    } catch (err) {
      process.stdout.write(`\n${Style.RED}◇ ${err.message}${Style.RESET}\n`);
      cleanup();
      process.exit(1);
    }
  });

cli.help();
cli.parse();
