# Plan: `doktor serve` CLI Implementation

## 1. Validated Intent
The goal is to implement a unified CLI command `doktor serve` that orchestrates the development environment.
- **Scope**: Start the Express backend (port 3001) and Vite frontend (port 4028).
- **Mode**: Development (hot reloading preserved via `tsx watch` and Vite HMR).
- **Constraints**: 
  - No Tauri desktop integration.
  - Single orchestrator process (not simple concurrent run).
  - Start once, run until Ctrl+C.
  - Graceful shutdown of both services.
- **Platform**: Windows (win32).

## 2. Engineering Approach
### Architecture: Subprocess Orchestrator
To maintain the existing development experience (hot reloading) and avoid massive refactoring of the server's top-level `await` structure, a **Subprocess Orchestrator** pattern will be used.
- **Orchestrator**: A Node.js script using the `cac` framework.
- **Server**: Spawned as a child process: `tsx watch --env-file server/.env server/src/index.ts`.
- **Frontend**: Spawned as a child process: `vite`.
- **Coordination**: The orchestrator will start the server first, poll for health, and then start the frontend.

### Graceful Shutdown
The orchestrator will capture `SIGINT` (Ctrl+C) and propagate termination signals to children in order:
1. Vite $\rightarrow$ Express.
2. 5-second hard-kill timeout if processes hang.

### CLI Framework
**`cac`** was chosen for its minimal footprint (~1.5KB), zero dependencies, and TypeScript compatibility.

## 3. Implementation Details

### File Changes
| Action | File | Description |
|---|---|---|
| **Create** | `bin/doktor.js` | The main CLI logic, process spawning, and signal handling. |
| **Modify** | `package.json` (root) | Add `cac` to `devDependencies` and add `"bin": { "doktor": "./bin/doktor.js" }`. |
| **Delete** | `proxy-server.js` | Remove dead code that conflicts with the main server on port 3001. |

### Logic Flow (`doktor serve`)
1. **Initialize**: Setup `cac` and define the `serve` command.
2. **Backend Start**: Spawn `tsx watch` for the server.
3. **Health Check**: Poll `http://localhost:3001` until a response is received (10s timeout).
4. **Frontend Start**: Spawn `vite`.
5. **Logging**: Prefix all stdout/stderr from children with `[server]` or `[frontend]`.
6. **Completion**: Print `DokTor ready → http://localhost:4028`.
7. **Teardown**: Catch `SIGINT` $\rightarrow$ Kill children $\rightarrow$ Exit.

## 4. Risks & Mitigations
- **Log Interleaving**: Mitigated by explicit `[server]` and `[frontend]` prefixing.
- **Windows Signals**: Use `process.on('SIGINT')` for reliable Ctrl+C detection.
- **Startup Failures**: If the server fails to start (e.g. port 3001 taken), the orchestrator will timeout and exit with an error before starting the frontend.

## 5. Verification Plan
- **Happy Path**: Run `doktor serve` $\rightarrow$ verify browser opens at :4028 $\rightarrow$ verify server logs appear.
- **Shutdown Path**: Ctrl+C $\rightarrow$ verify both child processes are terminated.
- **Failure Path**: Occupy port 3001 $\rightarrow$ verify `doktor serve` fails gracefully with timeout.
