# Go Proxy Pattern — Wiring TypeScript Tools to the Go Agent

## Architecture Overview

The Vercel AI SDK `streamText()` runs the model's tool loop **client-side** in the browser. Each tool registered with `streamText()` has a TypeScript `execute()` function. The Go agent (port 3002) already has 25 tools implemented with filesystem access, git, shell commands, and parallel execution.

The **Go Proxy Pattern** lets TypeScript tool stubs delegate execution to the Go agent via a single HTTP endpoint:

```
Model (in streamText loop)
  │  tool call JSON: { tool: "read_file", params: { path: "..." } }
  ▼
TypeScript execute()          ← defines schema for the model, lightweight
  │
  │  HTTP POST localhost:3002/api/tools/execute
  ▼
Go Executor.Execute()          ← runs the actual implementation
  │  - filesystem (os.ReadFile)
  │  - git (exec.Command)
  │  - shell (exec.CommandContext)
  │  - goroutines for parallel grep/walk
  ▼
Result returned → streamText() feeds it back to model
```

## Why This is Fast

- Go agent runs as a local process on `127.0.0.1:3002` — HTTP round trip is **~2–10ms** (can spike to ~20ms on Windows loopback under load)
- Model generates tokens at **~100–1000ms+** per step — tool overhead is noise
- Go executor uses goroutines for parallel directory walks, grep, and recursive operations
- Single source of truth — tool implementations live in Go, not duplicated in TypeScript

## Implementation

### Step 1: Add `POST /api/tools/execute` to the Go Agent

**File:** `agent/internal/server/server.go`

Add route registration:

```go
s.router.HandleFunc("/api/tools/execute", s.handleExecuteTool).Methods("POST")
```

Add handler:

```go
func (s *Server) handleExecuteTool(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Tool   string         `json:"tool"`
        Params map[string]any `json:"params"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid request body")
        return
    }

    call := api.ToolCall{
        Tool:   req.Tool,
        Params: req.Params,
    }
    result := s.executor.Execute(r.Context(), call)

    if result.Error != "" {
        writeJSON(w, http.StatusOK, map[string]any{
            "error":  result.Error,
            "result": nil,
        })
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{
        "error":      nil,
        "result":     result.Result,
        "durationMs": result.Duration,
    })
}
```

> **Security note:** The `/api/tools/execute` endpoint has no authentication — any local process can invoke any Go tool. This is acceptable because the agent is bound to `127.0.0.1` and intended for local development only. If the endpoint is ever exposed beyond localhost, add API-key or token-based auth middleware.

The Go `Executor.Execute()` method already does handler lookup + execution + error handling:

```go
func (e *Executor) Execute(ctx context.Context, call api.ToolCall) api.ToolCall {
    start := time.Now()
    handler, ok := e.registry.GetHandler(call.Tool)
    if !ok {
        call.Error = fmt.Sprintf("unknown tool: %s", call.Tool)
        call.Duration = time.Since(start).Milliseconds()
        return call
    }
    result, err := handler(ctx, e, call.Params)
    call.Duration = time.Since(start).Milliseconds()
    if err != nil {
        call.Error = err.Error()
    } else {
        call.Result = result
    }
    return call
}
```

### Step 2: Create the TypeScript Go Proxy Client

**File:** `src/services/tools/goProxy.ts`

```typescript
const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:3002';
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 200;

interface GoToolResult {
  result: any;
  error: string | null;
  durationMs: number;
}

/** Fetch with simple exponential backoff for transient failures. */
async function fetchWithRetry(url: string, opts: RequestInit, retries: number): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, opts);
    if (res.ok || attempt >= retries) return res;
    await new Promise(r => setTimeout(r, BASE_DELAY_MS * (1 << attempt)));
  }
}

export async function callGoTool(tool: string, params: Record<string, any>): Promise<any> {
  const res = await fetchWithRetry(
    `${AGENT_URL}/api/tools/execute`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, params }),
    },
    MAX_RETRIES,
  );

  if (!res.ok) {
    let errMsg: string;
    try {
      const body = await res.json();
      errMsg = body.error || res.statusText;
    } catch {
      errMsg = res.statusText;
    }
    throw new Error(errMsg);
  }

  const data: GoToolResult = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}
```

### Step 3: Refactor TypeScript Tool Stubs to Use Go Proxy

Each tool stub that needs filesystem, git, or shell access changes from calling Tauri APIs to calling the Go proxy.

**Before (Tauri fs):**

```typescript
import { readTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '../../../lib/tauri';

export const readFileTool: ToolDef = {
  name: 'read_file',
  execute: async ({ path }) => {
    if (!isTauri()) throw new Error('Filesystem requires Tauri desktop app');
    const content = await readTextFile(path);
    return { path, content, length: content.length };
  },
};
```

**After (Go proxy):**

```typescript
import { z } from 'zod';
import type { ToolDef } from '../types';
import { callGoTool } from '../goProxy';

export const readFileTool: ToolDef = {
  name: 'read_file',
  description: 'Read the entire contents of a file at the specified path.',
  category: 'code',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to read.'),
  }),
  execute: async ({ path }) => {
    return callGoTool('read_file', { path });
  },
};
```

The schema definition stays in TypeScript (so the model knows the input shape) but execution is delegated to Go.

Apply this pattern to all tools that need filesystem, git, or shell:

| Tool | Old backend | New backend |
|---|---|---|
| `read_file`, `write_file`, `edit_file` | Tauri fs | Go proxy |
| `list_directory`, `find_files` | Tauri fs | Go proxy |
| `grep_files`, `code_search` | Tauri fs | Go proxy |
| `file_stats`, `count_lines` | Tauri fs | Go proxy |
| `glob_files` | Tauri fs | Go proxy |
| `git_status`, `git_diff`, `git_log` | Express backend | Go proxy |
| `git_branches`, `git_show` | Express backend | Go proxy |
| `run_command`, `list_processes` | Express backend | Go proxy |

**Keep direct in TypeScript** (no Go hop needed):

| Tool | Backend | Why |
|---|---|---|
| `web_search`, `fetch_page` | Express (direct) | Already works, web API |
| `image_search`, `news_search` | Express (direct) | Already works, web API |
| `http_request`, `check_url` | Plain fetch | Already works, no benefit from Go |
| `system_info` | Browser APIs | Navigator info, no Go needed |
| `resolve_path` | String manipulation | Pure computation, no I/O |
| `write_artifact` | React state | Must run in browser for UI |

### Step 4: Register All Tools with streamText()

**File:** `src/services/aiService.ts`

```typescript
import { webSearchTool, fetchPageTool, imageSearchTool, newsSearchTool } from './ai/tools/webSearchTool';
import { writeArtifactTool } from './ai/tools/writeArtifactTool';
import { readFileTool } from '../tools/code/readFile';
import { writeFileTool } from '../tools/code/writeFile';
import { editFileTool } from '../tools/code/editFile';
import { listDirectoryTool } from '../tools/code/listDirectory';
import { findFilesTool } from '../tools/code/findFiles';
import { grepFilesTool } from '../tools/code/grepFiles';
import { codeSearchTool } from '../tools/code/codeSearch';
import { fileStatsTool } from '../tools/code/fileStats';
import { countLinesTool } from '../tools/code/countLines';
import { globFilesTool } from '../tools/code/globFiles';
import { gitStatusTool } from '../tools/git/gitStatus';
import { gitDiffTool } from '../tools/git/gitDiff';
import { gitLogTool } from '../tools/git/gitLog';
import { gitBranchesTool } from '../tools/git/gitBranches';
import { gitShowTool } from '../tools/git/gitShow';
import { runCommandTool } from '../tools/system/runCommand';
import { systemInfoTool } from '../tools/system/systemInfo';
import { listProcessesTool } from '../tools/system/listProcesses';
import { resolvePathTool } from '../tools/system/resolvePath';
import { httpRequestTool } from '../tools/network/httpRequest';
import { checkUrlTool } from '../tools/network/checkUrl';
```

Then add them to the `tools` object in the `streamText()` call:

```typescript
return streamText({
  model: currentModel,
  system: fullSystemPrompt,
  messages: filteredMessages,
  tools: {
    // Direct tools (no Go hop)
    writeArtifact: writeArtifactTool,
    webSearch: webSearchTool,
    fetchPage: fetchPageTool,
    imageSearch: imageSearchTool,
    newsSearch: newsSearchTool,
    systemInfo: systemInfoTool,
    resolvePath: resolvePathTool,
    httpRequest: httpRequestTool,
    checkUrl: checkUrlTool,

    // Go-proxied tools (execution via Go agent)
    readFile: readFileTool,
    writeFile: writeFileTool,
    editFile: editFileTool,
    listDirectory: listDirectoryTool,
    findFiles: findFilesTool,
    grepFiles: grepFilesTool,
    codeSearch: codeSearchTool,
    fileStats: fileStatsTool,
    countLines: countLinesTool,
    globFiles: globFilesTool,
    gitStatus: gitStatusTool,
    gitDiff: gitDiffTool,
    gitLog: gitLogTool,
    gitBranches: gitBranchesTool,
    gitShow: gitShowTool,
    runCommand: runCommandTool,
    listProcesses: listProcessesTool,
  },
  // ...
});
```

### Step 5: Conditionally Add Tools

In browser-only mode (no Go agent running), skip Go-dependent tools:

```typescript
const tools: Record<string, Tool> = {
  writeArtifact: writeArtifactTool,
  webSearch: webSearchTool,
  fetchPage: fetchPageTool,
  imageSearch: imageSearchTool,
  newsSearch: newsSearchTool,
};

if (goAgentAvailable) {
  Object.assign(tools, {
    readFile: readFileTool,
    writeFile: writeFileTool,
    // ... all Go-proxied tools
  });
}
```

Check Go agent availability:

```typescript
async function checkGoAgent(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:3002/health', { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}
```

## Data Flow Summary

```
User message
  │
  ▼
streamText({ model, tools })
  │
  ├─ Model generates tool call: { tool: "read_file", args: { path: "..." } }
  │
  ├─ TypeScript tool.execute({ path: "..." })
  │     │
  │     ├─ web tools → Express backend (port 3001) → search API
  │     ├─ network tools → fetch() → external URL
  │     ├─ system_info → navigator APIs
  │     └─ code/git/system → callGoTool("read_file", { path })
  │           │
  │           └─ HTTP POST localhost:3002/api/tools/execute
  │                 │
  │                 └─ Go Executor.Execute()
  │                       ├─ reads file via os.ReadFile
  │                       ├─ runs git via exec.Command
  │                       └─ returns { result, error, durationMs }
  │
  ├─ Result returned to model as tool response
  │
  └─ Model continues generating with tool result context
```

## Performance Budget

| Step | Time |
|---|---|
| Model generates tool call JSON | ~200–2000ms |
| TypeScript dispatches | <1ms |
| HTTP POST to Go agent | ~2–10ms |
| Go tool executes | ~1–500ms (file read: 1ms, grep dir: 10–500ms) |
| HTTP response | ~2–10ms |
| streamText() feeds result to model | <1ms |
| Model generates next tokens | ~200–2000ms |
| **Total per tool call** | **~400–2500ms** (dominated by model, not Go proxy) |

The Go proxy adds ~2–10ms overhead per tool call, which is **0.5–2%** of the total step time.
