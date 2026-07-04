# Agent Sandboxing — Windows Job Objects & Restricted Tokens

## Problem

The Go agent (`agent/`) executes LLM-generated tool calls with zero isolation. Every tool runs with the full privileges of the user account:

| Tool | Risk |
|---|---|
| `run_command` | `exec.CommandContext(ctx, "sh", "-c", command)` — can run anything |
| `write_file` / `edit_file` | `os.WriteFile` — can write anywhere on disk |
| `http_request` | `http.Client.Do` — can hit any URL, including internal services |
| `read_file` | `os.ReadFile` — can read any file the user can access |

An LLM (benevolent or compromised) could trivially ask the agent to `rm -rf /`, exfiltrate SSH keys, or install malware. The agent has no defense today.

## Current State

```
LLM (in streamText loop)
  │  tool call JSON
  ▼
Go Executor.Execute()
  │
  ├─ run_command → exec.Command("sh", "-c", ...)   ← unrestricted
  ├─ write_file  → os.WriteFile(path, data)         ← unrestricted
  ├─ read_file   → os.ReadFile(path)                ← unrestricted
  ├─ http_request→ http.Client.Do(req)              ← unrestricted
  └─ ...                                            ← unrestricted
```

Enforcement is at the OS user level only — if you ran the agent as a limited user, that's the only thing stopping it.

## Goals

- **Memory cap** — prevent fork-bomb / OOM (per-process, kernel-enforced via Job Object)
- **Kill-on-close** — no orphan processes when task finishes or agent crashes (guaranteed by kernel)
- **Process count limit** — prevent fork bombs (max processes in the job)
- **Restricted token** — no writes outside allowed paths, no privilege escalation, low integrity
- **Path allowlisting** — file tools reject writes/reads outside the project root
- **Domain allowlisting** — `http_request` only talks to known services (or denied entirely by default)
- **Zero daemon, zero idle RAM** — this runs in-process, on-demand, no background service needed

## What We Use

### Windows Job Objects

A kernel object that groups processes and enforces limits. No daemon, no service, no persistent memory cost. When the job handle is closed, **every process in the job is killed** — guaranteed by the NT kernel.

```go
import "golang.org/x/sys/windows"

job, err := windows.CreateJobObject(nil, nil)
// JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE — teardown on handle close
// JOB_OBJECT_LIMIT_PROCESS_MEMORY — 128MB per-process cap
// JOB_OBJECT_LIMIT_ACTIVE_PROCESS — max 10 processes (prevents fork bombs)
info := windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION{...}
windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation, ...)
```

Key flags:
- `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` — the instant `CloseHandle(job)` runs, every process in the job is terminated. This is your guaranteed teardown.
- `JOB_OBJECT_LIMIT_PROCESS_MEMORY` — hard cap per process (not just the job). Prevents a single runaway process from exhausting system RAM.
- `JOB_OBJECT_LIMIT_ACTIVE_PROCESS` — hard cap on number of processes in the job. Blocks fork bombs.
- `JOB_OBJECT_LIMIT_JOB_TIME` — optional global time limit for the entire job.

### Restricted Tokens

A restricted access token drops privileges and runs at a low integrity level. This is what Chrome uses to sandbox renderer processes.

```go
// DISABLE_MAX_PRIVILEGE — strips all privileges (SeDebugPrivilege, etc.)
// Deny-SID for Administrators group — even if the process tries to elevate
// Low integrity label (SID: S-1-16-4096) — can't write to most of the filesystem
var token windows.Token
windows.CreateRestrictedToken(existingToken, windows.DISABLE_MAX_PRIVILEGE, ...)
windows.SetTokenInformation(token, windows.TokenIntegrityLevel, ...)
```

What this blocks:
- Writing to `C:\Program Files`, `C:\Windows`, most of `%APPDATA%`
- Reading protected system files
- Elevating to admin (deny-SID + stripped privileges)
- Accessing other user's data

What it allows:
- Writing to `%USERPROFILE%\AppData\LocalLow` (the Low integrity writable area)
- Writing to explicitly granted paths via file tool allowlisting

### Path Allowlisting

All file tool handlers check that the resolved absolute path is under the project root:

```go
func guardPath(root, target string) error {
    rootAbs, _ := filepath.Abs(root)
    tgtAbs, _ := filepath.Abs(target)
    tgtReal, _ := filepath.EvalSymlinks(tgtAbs) // block symlink escapes
    if !strings.HasPrefix(tgtReal, rootAbs) {
        return fmt.Errorf("path %q is outside project root", target)
    }
    return nil
}
```

- Resolve symlinks before checking — prevents `/project/link -> /etc/passwd` escapes
- Reject `..` traversal explicitly
- Reject hidden dotfiles unless the tool call explicitly requests them

### Domain Allowlisting

`http_request` checks the parsed URL host against an allowlist:

```go
var allowedDomains = map[string]bool{
    "api.github.com": true,
    "registry.npmjs.org": true,
    "google.com": true,
    // ...
}
```

- Default-deny: if the domain isn't in the list, reject
- Reject raw IPs by default (prevents SSRF to internal services)
- Allow permissive mode as a config override, not default

## Implementation Plan

### Phase 1: `agent/internal/sandbox/` package

Create the core sandboxing primitives in a dedicated Go package:

```go
package sandbox

type Sandbox struct {
    job windows.Handle
}

func New(limitMemoryMB uint64) (*Sandbox, error)
func (s *Sandbox) Launch(name string, args []string, workdir string) (*Process, error)
func (s *Sandbox) Close() error  // kills all processes, closes job handle
```

- `New` creates a Job Object with `KILL_ON_JOB_CLOSE`, memory limit, process limit
- `Launch` creates a process suspended, creates restricted token, assigns to job, then resumes
- `Close` closes the job handle — kernel kills everything immediately

**Tests:**
- Verify `KillOnClose` kills all child processes when sandbox is closed
- Verify `ProcessMemoryLimit` caps memory (spawn a memory eater, confirm it's killed)
- Verify restricted token can't write outside allowed areas

### Phase 2: Wire into `runShell`

Replace the bare `exec.CommandContext` call in `run_command.go` with a sandboxed launch:

```go
// Before (tool.go:65-88):
cmd := exec.CommandContext(ctx, "sh", "-c", command)

// After:
sb, _ := sandbox.New(128)
defer sb.Close()
proc, _ := sb.Launch("sh", []string{"-c", command}, workdir)
```

- Keep the unsandboxed path as a fallback when sandbox APIs aren't available (macOS/Linux dev builds, or when running without admin rights on Windows)
- Gate behind a build tag or runtime check

### Phase 3: File tool guarding

Add `guardPath` checks to `write_file.go`, `read_file.go`, `edit_file.go`:

```go
func writeFileTool() ToolDef {
    return ToolDef{
        // ...
        Handler: func(ctx context.Context, e *Executor, params map[string]any) (any, error) {
            path, _ := params["path"].(string)
            if err := guardPath(projectRoot, path); err != nil {
                return nil, err
            }
            // proceed with write...
        },
    }
}
```

### Phase 4: `http_request` allowlisting

In `http_request.go`, parse URL and check host against a configured allowlist. Reject private IPs and loopback by default.

## What to Avoid

### Avoid: Docker as a sandbox

- Docker daemon idles at 100-300MB RAM. On a 4GB machine this is a significant tax before any task runs.
- The Go agent needs access to the Docker socket to spawn containers — that socket is itself a privilege escalation target.
- Image management adds build steps, storage overhead, and complexity.
- **Job Objects do everything needed here with zero daemon overhead.**

### Avoid: WSL2 + bwrap hybrid

- WSL2 runs a persistent Linux VM (~500MB-1GB RAM). On a 4GB machine that's crippling.
- Adds a Linux VM dependency to a Windows desktop app — every user would need WSL2 installed.
- `bwrap` inside WSL2 is simpler code than Win32 API calls, but the VM memory cost is prohibitive here.

### Avoid: MicroVMs (Firecracker)

- Needs KVM support, custom kernel images, rootfs images — enormous complexity for per-task isolation.
- Even "micro" VMs need 128MB+ baseline per VM.
- Designed for cloud providers running thousands of VMs per host, not a laptop dev tool with 4GB RAM.

### Avoid: Under-restricting the token

Common mistakes:
- Forgetting to set the integrity level (default is Medium — too permissive)
- Not stripping `SeChangeNotifyPrivilege` (allows traversing directories outside allowed paths)
- Not adding deny-SIDs for BUILTIN\Administrators, SYSTEM, and Authenticated Users
- Not testing: spawn `cmd.exe` inside the sandbox and try `echo test > C:\Windows\test.txt` — if it succeeds, your token restriction is wrong

**Always test with `whoami /priv` and `icacls` inside the sandbox to verify restrictions.**

### Avoid: Over-engineering from day one

Ship a minimal sandbox in Phase 1 (Job Object + memory cap + path guard). Iterate to add restricted tokens, URL allowlisting, and audit logging. The current state is one prompt away from disaster — don't let perfect be the enemy of safe.

### Avoid: Hard-coding project root

The project root should be configurable (env var, config file, or passed as a flag). Not every invocation is inside `C:\Users\zephy\Documents\Raw-Code`.

### Avoid: Ignoring macOS/Linux

Even if Windows is primary, the sandbox abstraction should have a no-op fallback for development on other platforms. Use build tags or a runtime check:

```go
// +build windows

func NewSandbox(...) (*Sandbox, error) { /* real implementation */ }
```

```go
// +build !windows

func NewSandbox(...) (*Sandbox, error) {
    return nil, fmt.Errorf("sandbox not supported on this platform")
}
```

This keeps the code portable and doesn't break `go build` on macOS/Linux.

## What We're Missing

| Gap | Priority | Notes |
|---|---|---|
| **macOS / Linux fallback** | Medium | `bwrap` on Linux, `sandbox-exec` on macOS. No-op fallback for dev. |
| **Per-task temp directory** | High | `os.MkdirTemp` per task, mounted as the writable space. Cleaned up via `defer os.RemoveAll`. |
| **Network sandbox beyond URL allowlisting** | Low | Full network disable for most tools. `--unshare-net` equivalent on Windows is complex. For now, URL allowlisting covers the real risk. |
| **Seccomp / syscall filtering** | Low | Overkill for now. Windows equivalent (Win32 Filter) is complex. Revisit if the agent starts running arbitrary code. |
| **Audit logging of violations** | Medium | Log denied writes, blocked URLs, memory cap hits. Helps debug false positives and detect escape attempts. |
| **User-configurable limits** | Low | Memory cap, domain allowlist overrides in the app settings. Easy to add later. |
| **Integrity self-test on startup** | Medium | On startup, spawn a test process, verify it can't write outside allowed paths. Alert the user if sandboxing isn't working. |
| **Time limit enforcement** | Medium | Job Object supports `JOB_OBJECT_LIMIT_JOB_TIME` — kill the job after N seconds. Adds defense-in-depth against infinite loops. |
| **UI for sandbox violations** | Low | Display blocked operations in the chat UI so the user knows what was denied. |
| **Spawn sandboxed as non-admin** | Medium | If the user runs the app as admin (Node/Golang devs often do), the restricted token still drops admin privileges. Confirm this works. |
| **Child process tree tracking** | Low | Job Objects naturally track all descendants, but exposing this for debugging (which processes were spawned, what did they do) is useful later. |

## Open Questions

1. **Should `http_request` be network-disabled by default?** Most agent tasks don't need network access at all. The URL allowlist is a middle ground, but disabling the tool entirely unless the user explicitly enables it is safer.

2. **How should the project root be determined?** Passed by the Tauri shell? Read from a config file? Hard-coded during build? The path guard is only useful if we know the boundary.

3. **Should restricted tokens apply to ALL tools or only `run_command`?** File tools already have OS-level restrictions (the user account), but a restricted token adds defense-in-depth. Running the entire Go agent as a restricted process would limit what the agent itself can do, but may break tools like `system_info` or `list_processes` that need to read system state.

4. **What about the Go sidecar's own config/secrets?** The sandbox protects the *host* from the *agent*. It doesn't protect the *agent's own storage* from the LLM. API keys, config, and session data the agent holds are still accessible to a compromised tool call.
