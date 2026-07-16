# GitHub Connector — Leverage Ideas for the Video Pipeline

All ideas leverage the existing `GitHubConnectorService` (OAuth + `apiFetch`) with the
`createRepoFromTemplate` and `dispatchWorkflow` methods already added.

---

## Quick Wins (Already Wired)

### 1. Auto-create Pipeline Repo

On first `edit_video` call (or on GH connect), detect if the user has a pipeline repo.
If not, create one from the template silently.

**Flow:**

```
User connects GitHub
       │
       ▼
Check if "raw-code-video-pipeline" exists in user's repos
       │
       ├── Yes → use it
       │
       └── No  → POST /repos/raw-code/video-pipeline-template/generate
                  { owner: "raw-code", repo: "video-pipeline-template", name: "raw-code-video-pipeline", private: true }
                  → store repo name in oauth_tokens metadata
```

**Code path:** `GitHubConnectorService.createRepoFromTemplate()`
**Trigger:** After OAuth token exchange in `exchangeCode()`, or lazily on first `edit_video` call.
**State:** Store `{ pipelineRepoOwner, pipelineRepoName }` in the token metadata field.

### 2. List Recent Pipeline Runs

Show a run history in the GH connector detail modal or Drive panel.

**API:** `GET /repos/{owner}/{repo}/actions/runs?event=workflow_dispatch&per_page=20`
**Response:**

```json
{
  "workflow_runs": [
    {
      "id": 12345,
      "status": "completed",
      "conclusion": "success",
      "head_branch": "main",
      "created_at": "2026-07-14T12:00:00Z",
      "updated_at": "2026-07-14T12:05:00Z",
      "html_url": "https://github.com/.../actions/runs/12345"
    }
  ]
}
```

**UI:** A small table in the RunDashboard or a new "Pipeline History" tab in the Drive connector.
**Code:** Add `listWorkflowRuns(owner, repo)` to `GitHubConnectorService`.

---

## Medium Effort

### 3. Fetch Run Logs on Failure

When a pipeline fails, fetch the full FFmpeg stderr and surface it in the app.

**API:** `GET /repos/{owner}/{repo}/actions/runs/{runId}/logs`
**Flow:**

```
poll_render_job returns conclusion: "failure"
       │
       ▼
App fetches logs ZIP from GH API
       │
       ▼
Extract relevant step log (e.g. "Run FFmpeg pipeline")
       │
       ▼
Display last 50 lines of FFmpeg output in the error UI
```

**Key detail:** The logs endpoint returns a ZIP of all step logs. We'd need to:
1. Download the ZIP
2. Find the log file for the FFmpeg processing step
3. Extract the tail (FFmpeg error output)

**Code:** Add `fetchRunLogs(owner, repo, runId) → string` to `GitHubConnectorService`.
**Integration:** Hook into `poll_render_job` output — when `status === 'failed'`, optionally fetch logs and return `error` with the FFmpeg stderr snippet.

### 4. Smart Auto-Retry

The existing `retryOnFailure` in `edit_video` retries blind. Make it smarter:

1. Fetch the run logs on failure
2. Scan FFmpeg output for *transient* error patterns vs. *permanent* ones

| Error Pattern | Type | Action |
|--------------|------|--------|
| `Connection reset by peer` | Transient | Retry |
| `Timeout` | Transient | Retry |
| `Invalid data found when processing input` | Permanent | Fail — manifest issue |
| `Unknown encoder 'libx264'` | Permanent | Fail — environment issue |
| `No such file or directory` | Permanent | Fail — missing source |

Only retry on transient patterns. Saves time and avoids infinite loops on broken manifests.

### 5. Commit Manifests & Results to Repo

After a successful run, commit a record of the manifest + result back to the pipeline repo.

**API:** `PUT /repos/{owner}/{repo}/contents/runs/{jobId}.json`
**Body:**

```json
{
  "message": "Pipeline result: {jobId}",
  "content": "<base64 of manifest + result JSON>",
  "branch": "main"
}
```

**Result file:**

```json
{
  "jobId": "550e8400-...",
  "createdAt": "2026-07-14T12:00:00Z",
  "completedAt": "2026-07-14T12:05:00Z",
  "manifest": { "...": "..." },
  "outputFileId": "drive-file-id-123",
  "workflowUrl": "https://github.com/.../actions/runs/12345"
}
```

**Benefits:**
- Full audit trail of every pipeline run
- User can browse past runs via the repo on GitHub
- Enables "re-run with same manifest" button

**Code:** Add `commitFile(owner, repo, path, content, message)` to `GitHubConnectorService`.

---

## Higher Effort

### 6. Webhook-Based Completion (No Polling)

Replace polling with a GitHub repo webhook that POSTs to the app when a workflow run completes.

**Setup (one-time per repo):**
```
POST /repos/{owner}/{repo}/hooks
{
  "name": "web",
  "config": {
    "url": "https://app.example.com/api/v1/github-webhook",
    "content_type": "json",
    "secret": "<shared-secret>"
  },
  "events": ["workflow_run"]
}
```

**Flow:**

```
GH Actions run completes
       │
       ▼
GitHub POSTs to /api/v1/github-webhook
  { action: "completed", workflow_run: { id, status, conclusion, ... } }
       │
       ▼
Server matches the run ID to a pending job
       │
       ▼
Server marks job as completed/failed, notifies agent via event bus
       │
       ▼
No more polling needed — instant notification
```

**Tradeoffs:**
- + Eliminates polling delay (instant vs up-to 5s)
- + Reduces GH API rate limit usage
- - Requires a public-facing webhook endpoint
- - Needs webhook secret verification
- - One-time setup per pipeline repo

**Route:** Add `POST /api/webhooks/github` to `server/src/index.ts` with HMAC verification.
**Integration:** On `workflow_run.completed` event, look up jobId in `ToolOutputStore` or a local job index, update status.

### 7. GH Artifacts for Intermediates

For multi-segment pipelines, upload intermediate files as GH Actions artifacts instead of Drive.

**In `process.sh`:**

```bash
# After each segment, upload as artifact
ffmpeg ... trimmed_0.mp4
gh run upload trimmed_0.mp4 --name trimmed_0

ffmpeg ... filtered_1.mp4
gh run download trimmed_0  # download from previous step
ffmpeg -i trimmed_0.mp4 ... filtered_1.mp4
```

**Why:**
- Faster than Drive API (same-machine upload vs. HTTP to Drive)
- No Drive rate limits for intermediates
- Automatically cleaned up when GH run expires (90 days)

**Why not:**
- GH artifact storage limited to 500 MB total on free tier
- Only works within a single run — can't persist between runs
- Requires `gh` CLI installed on runner (already there by default)

**Verdict:** Only worth it for pipelines with many large intermediates (>10 segments).

### 8. Pause / Resume Pipeline

Add a pause mechanism by having the runner check an input flag:

**Workflow YAML change:**

```yaml
- name: Check pause flag
  run: |
    while [[ "$(gh api repos/${{github.repository}}/actions/runs/${{github.run_id}} --jq '.inputs.paused')" == "true" ]]; do
      echo "Pipeline paused — waiting..."
      sleep 30
    done
```

Then a user can "pause" from the app:

```
POST /repos/{owner}/{repo}/actions/runs/{runId}/inputs
{ "paused": "true" }
```

**In practice:** GH doesn't support modifying workflow_dispatch inputs mid-run. Alternative:

- Use a repo variable: `POST /repos/{owner}/{repo}/variables/PIPELINE_PAUSED` — runner polls this
- Use a GitHub deployment status

**Complexity:** High for limited value. Skip unless specifically requested.

---

## Priority Matrix

| Idea | Effort | Impact | Dependencies |
|------|--------|--------|-------------|
| Auto-create pipeline repo | Low | High | Already have `createRepoFromTemplate` |
| List recent pipeline runs | Low | Medium | Simple GH API call |
| Fetch logs on failure | Medium | High | `fetchRunLogs()` + frontend display |
| Smart auto-retry (log analysis) | Medium | Medium | Builds on #3 |
| Commit manifests to repo | Medium | Medium | Need `commitFile()` on connector |
| Webhook completion | High | Medium | Server endpoint + HMAC + job index |
| GH artifacts for intermediates | High | Low | Storage limits, runner-only |
| Pause/resume | High | Low | Polling workaround, edge cases |

---

## Suggested Implementation Order

1. **Auto-create pipeline repo** — already half done, just needs the trigger
2. **List recent runs** — quick API wrapper, useful in UI
3. **Fetch logs on failure** — most user-facing value, debugs 90% of failure cases
4. **Smart retry** — builds on #3 naturally
5. **Commit manifests** — audit trail, nice to have
6. **Webhook** — only if polling rate limits become a problem

---

## Implementation Status

All 6 items from the priority matrix have been implemented:

| # | Idea | Status | Key Files |
|---|------|--------|-----------|
| 1 | Auto-create pipeline repo | ✅ Done | `server/src/connectors/github.ts` — `ensurePipelineRepo()` called from `exchangeCode()` |
| 2 | List recent pipeline runs | ✅ Done | `server/src/connectors/github.ts` — `listWorkflowRuns()` |
| 3 | Fetch run logs on failure | ✅ Done | `server/src/connectors/github.ts` — `fetchRunLogs()`, handles ZIP + plain text |
| 4 | Smart auto-retry | ✅ Done | `packages/tool-runtime/src/video/edit-video.ts` — `classifyError()` with 20+ patterns |
| 5 | Commit manifests | ✅ Done | `server/src/connectors/github.ts` — `commitFile()`, SHA-aware create/update |
| 6 | Webhook completion | ✅ Done | `server/src/routes/webhooks.ts` — HMAC verification, job registry, callback dispatch |

### Webhook Implementation Details

**Server endpoints:**
- `POST /webhooks/github` — Receives GH `workflow_run` events, verifies HMAC signature via `GITHUB_WEBHOOK_SECRET`, matches run ID to registered job, calls callback URL
- `POST /webhooks/github/jobs` — Registration endpoint for job → runId mapping

**Connector methods:**
- `setupWebhook(owner, repo, url, secret, events?)` — registers a repo webhook for `workflow_run` events
- Called once per pipeline repo

**Tool integration:**
- `edit_video` accepts optional `webhookRegisterUrl` input param
- When provided, POSTs `{ jobId, runId, repoOwner, repoName, callbackUrl }` to the server after dispatch
- Fallback: if registration fails, tool continues in polling mode (no disruption)

**Webhook flow:**
```
edit_video tool                        Server                    GitHub
      │                                  │                         │
      ├── POST /webhooks/github/jobs ───►│                         │
      │   { jobId, runId, repoOwner,     │                         │
      │     repoName, callbackUrl }       │                         │
      │                                  │                         │
      │                                  │   (pipeline runs...)    │
      │                                  │                         │
      │                                  │◄── POST /webhooks/github│
      │                                  │    { action: completed, │
      │                                  │      workflow_run: {...} │
      │                                  │      repository: {...} } │
      │                                  │                         │
      │                                  ├── Match runId to job    │
      │                                  ├── POST callbackUrl ────►│
      │                                  │   { conclusion, jobId } │
```

---

## Relevant Code

| File | Use |
|------|-----|
| `server/src/connectors/github.ts` | All new methods go here |
| `packages/tool-runtime/src/video/edit-video.ts` | Smart retry integration |
| `packages/tool-runtime/src/video/poll-render-job.ts` | Log fetching on failure |
| `server/src/index.ts` | Webhook route |
| `packages/tool-runtime/src/store.ts` | Job index for webhook lookup |
