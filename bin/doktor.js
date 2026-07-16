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
  BLUE: "\x1b[94m",
  PURPLE: "\x1b[95m",
  WHITE: "\x1b[97m",
  UNDERLINE: "\x1b[4m"
};

const LOGO = `
${Style.CYAN}${Style.BOLD}   ___        __   __             
  / _ \\ ___  / /__/ /_ ___  ____  
 / // // _ \\/  '_/ __// _ \\/ __/  
/____/ \\___//_/\\_\\\\__/ \\___//_/   ${Style.RESET}
${Style.DIM}──────────────────────────────────────────${Style.RESET}
`;

function pollPort(port, label, timeoutMs = 20000) {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      clearInterval(s);
      clearInterval(c);
      reject(new Error(`${label} failed to bind port ${port} within ${timeoutMs / 1000}s`));
    }, timeoutMs);

    const s = setInterval(() => {
      process.stdout.write(`\r${Style.YELLOW}${spinner[i++ % spinner.length]} Waiting for ${label}...${Style.RESET}`);
    }, 80);

    const c = setInterval(() => {
      const r = http.get(`http://localhost:${port}`, () => {
        r.destroy();
        clearInterval(c); clearInterval(s); clearTimeout(t);
        process.stdout.write(`\r${Style.GREEN}✔ ${label} is online.${Style.RESET}\n`);
        resolve();
      });
      r.on('error', () => r.destroy());
    }, 500);
  });
}

function startProcess(cmd, args, label) {
  const child = spawn('cmd.exe', ['/c', cmd, ...args], {
    stdio: 'inherit',
    env: { ...process.env, NODE_NO_WARNINGS: '1', FORCE_COLOR: '1' }
  });
  child.on('error', (e) => {});
  return child;
}

const cli = cac('doktor');

cli.command('serve', 'Start development environment')
  .action(async () => {
    process.stdout.write('\x1c');
    console.log(LOGO);
    console.log(`${Style.BOLD}${Style.WHITE}▶ Initializing DokTor...${Style.RESET}\n`);

    const children = [];

    const cleanup = () => {
      console.log(`\n${Style.YELLOW}⚡ Stopping services...${Style.RESET}`);
      children.forEach(c => { try { c.kill('SIGTERM'); } catch {} });
      setTimeout(() => process.exit(0), 1000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    try {
      // --- Backend ---
      console.log(`${Style.CYAN}[System]${Style.RESET} Starting Express Backend...`);
      const server = startProcess(tsx, ['watch', '--env-file', 'server/.env', 'server/src/index.ts'], 'Express');
      children.push(server);
      server.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.log(`\n${Style.RED}[Express] Process exited with code ${code}${Style.RESET}`);
        }
      });
      await pollPort(3001, 'Express Backend');

      // --- Frontend ---
      console.log(`${Style.CYAN}[System]${Style.RESET} Starting Vite Frontend...`);
      const frontend = startProcess(vite, [], 'Vite');
      children.push(frontend);
      frontend.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.log(`\n${Style.RED}[Vite] Process exited with code ${code}${Style.RESET}`);
        }
      });
      await pollPort(4028, 'Vite Frontend');

      // --- Ready ---
      console.log(`\n${Style.BOLD}${Style.GREEN}🚀 DOKTOR DEVELOPMENT ENVIRONMENT ONLINE${Style.RESET}`);
      console.log(`${Style.DIM}  Frontend:  ${Style.RESET}${Style.UNDERLINE}${Style.CYAN}http://localhost:4028${Style.RESET}`);
      console.log(`${Style.DIM}  Backend:   ${Style.RESET}${Style.UNDERLINE}${Style.CYAN}http://localhost:3001${Style.RESET}`);
      console.log(`${Style.DIM}  Press ${Style.RESET}${Style.BOLD}${Style.RED}Ctrl+C${Style.RESET}${Style.DIM} to stop all services.${Style.RESET}\n`);

    } catch (err) {
      console.error(`\n${Style.RED}❌ ${err.message}${Style.RESET}`);
      console.error(`${Style.YELLOW}💡 Try waiting a few seconds, then run:\n   Stop-Process -Name node -Force${Style.RESET}`);
      cleanup();
      process.exit(1);
    }
  });

cli.help();
cli.parse();
