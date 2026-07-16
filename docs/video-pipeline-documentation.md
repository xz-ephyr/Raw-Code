# Video Pipeline — System Documentation

Serverless video editing using **Google Drive** as storage + **GitHub Actions** as FFmpeg compute.
Cost: **$0/month** (15 GB Drive free + GH Actions free tier).

---

## Architecture

```
Agent / LLM / Workflow
       │
       ▼
┌──────────────────┐    ┌──────────────┐
│   edit_video     │───►│  Google Drive │
│   (Effect tool)  │    │  (OAuth2)     │
└──────────────────┘    └──────┬───────┘
       │                       │
       ▼                       ▼
GitHub API (workflow_dispatch)
       │
       ▼
┌───────────────────────────────────────────┐
│  GitHub Actions (ephemeral private repo)   │
│                                           │
│  1. Download source from Google Drive      │
│  2. process.sh parses manifest.json        │
│  3. Run FFmpeg operations sequentially     │
│  4. Upload result back to Google Drive     │
│  5. POST callback (optional)               │
└───────────────────────────────────────────┘
```

---

## Prerequisites

| Thing | How |
|-------|-----|
| Google account | Connect Drive OAuth in settings (`drive.file` scope) |
| GitHub account | Connect OAuth or provide PAT with `repo` scope |
| Pipeline repo | A private repo from the template containing `process.sh` + workflow YAML |

---

## The Edit Manifest

All edit operations are expressed as a JSON manifest:

```json
{
  "version": 1,
  "output": { "filename": "final.mp4", "codec": "libx264", "crf": 23 },
  "operations": [
    { "type": "trim", "source": "source.mp4", "start": "00:00:00", "end": "00:01:30" },
    { "type": "scale", "width": 1920 },
    { "type": "overlay", "source": "logo.png", "x": 10, "y": 10 },
    { "type": "audiomix", "source": "bgm.mp3", "volume": 0.3 },
    { "type": "concat", "sources": ["intro.mp4", "main.mp4", "outro.mp4"] },
    { "type": "gif", "source": "clip.mp4", "width": 480, "fps": 15 }
  ],
  "cleanup": { "deleteIntermediateFiles": true }
}
```

Operations stack sequentially — each output feeds into the next.

---

## Operations Reference

| Type | Schema fields | FFmpeg output |
|------|--------------|---------------|
| `trim` | `source`, `start`, `end?`, `duration?` | `-ss start -to end -i source -c copy` |
| `scale` | `width`, `height?` | `-vf "scale=w:h"` |
| `crop` | `width`, `height`, `x`, `y` | `-vf "crop=w:h:x:y"` |
| `speed` | `factor` | `setpts=1/f*PTS` + `atempo=f` |
| `overlay` | `source`, `x`, `y`, `scale?` | `overlay=x:y` |
| `drawtext` | `text`, `font?`, `fontSize?`, `color?`, `x?`, `y?` | `drawtext=text='...':font=...:fontsize=...` |
| `color` | `brightness?`, `contrast?`, `saturation?`, `gamma?` | `eq=brightness=...:contrast=...` |
| `concat` | `sources[]`, `reencode?` | `concat=n=N:v=1:a=1` |
| `audiomix` | `source`, `volume?`, `fadeIn?`, `fadeOut?` | `[1:a]volume=vol[a1];[0:a][a1]amix` |
| `normalizeaudio` | `targetLUFS?` | `loudnorm=I=-14` |
| `subtitles` | `source`, `file` | `subtitles=file.srt` |
| `gif` | `source`, `width?`, `fps?`, `maxDuration?` | Two-pass: palettegen + paletteuse |
| `thumbnail` | `source`, `at`, `width?`, `outputName?` | `-ss at -vframes 1 -vf scale=w:-2` |
| `preview` | `source`, `duration?`, `start?`, `width?`, `crf?` | Low-res scaled clip, ultrafast preset |

---

## Tools

### `edit_video` — Dispatch a pipeline

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `manifest` | `EditManifest` | required | All edit operations |
| `sourceFileId` | `string` | required | Google Drive file ID |
| `accessToken` | `string` | required | GH PAT or OAuth token |
| `repoOwner` | `string` | required | GitHub owner |
| `repoName` | `string` | required | GitHub repo name |
| `workflowFileName` | `string` | `render-video.yml` | Workflow file |
| `branch` | `string` | `main` | Git ref |
| `callbackUrl` | `string?` | — | POST completion notification |
| `wait` | `boolean?` | `false` | Block until pipeline completes |
| `pollIntervalMs` | `number?` | `5000` | Polling interval in wait mode |
| `pollTimeoutMs` | `number?` | `600000` | Max wait time (10 min) |
| `retryOnFailure` | `boolean?` | `false` | Auto-retry on pipeline failure |
| `maxRetries` | `number?` | `2` | Max retry attempts |
| `cleanupOldFiles` | `boolean?` | `false` | Delete old Drive files before run |
| `cleanupMaxAgeDays` | `number?` | `7` | Delete files older than N days |

**Output:**

```json
{
  "jobId": "550e8400-...",
  "dispatchId": 12345,
  "status": "pending | processing | completed | failed",
  "workflowUrl": "https://github.com/.../actions/runs/12345",
  "manifestPreview": "trim, scale, overlay...",
  "estimatedCommands": 6,
  "finalStatus": "completed",
  "finalConclusion": "success",
  "outputUrl": "https://..."
}
```

### `poll_render_job` — Check pipeline status

| Param | Description |
|-------|-------------|
| `jobId` | Job ID from edit_video |
| `runId`? | GH Actions run ID for real status |
| `repoOwner`? + `repoName`? + `accessToken`? | For GH API polling |

Step-level progress returned when GH credentials provided:

```json
{
  "status": "processing",
  "progress": 50,
  "currentStep": "Process",
  "stepCount": 5,
  "completedSteps": 2,
  "steps": [
    { "name": "Download", "status": "completed", "conclusion": "success" },
    { "name": "Process", "status": "in_progress" },
    { "name": "Encode", "status": "pending" }
  ]
}
```

### `preview_video` — Generate thumbnail / preview

Returns Drive's built-in thumbnail URL + web player preview link.

| Param | Default | Description |
|-------|---------|-------------|
| `sourceFileId` | — | Drive file ID |
| `accessToken` | — | Drive OAuth token |
| `timestamp` | `00:00:05` | Thumbnail frame position |
| `width` | `640` | Preview width |
| `thumbnailOnly` | `false` | Skip video preview |
| `previewDuration` | `15` | Preview clip length |

---

## Workflow Engine Integration

A **Video Edit** step type (`video_edit`) is available in the workflow editor:

- **Add Step dropdown** — pink "Video Edit" option
- **Config panel** — fields for Drive file ID, GH repo, manifest JSON, callback URL
- **Template** — "Video Edit" template (Upload → Run Pipeline → Download Result)
- **Runner** — mock output includes `jobId`, `status`, `workflowUrl`

---

## Google Drive Connector

Registered as `google-drive` in the connector registry.

| Action | Description |
|--------|-------------|
| `uploadFile(name, mimeType, body)` | Upload to `appDataFolder`, returns `{id, name, size, webViewLink}` |
| `downloadUrl(fileId)` | Returns `https://.../files/{id}?alt=media` (requires access token) |
| `deleteFile(fileId)` | DELETE request to Drive API |
| `listFiles(pageSize?)` | Lists files in `appDataFolder` |
| `deleteOlderThan(cutoffMs)` | Bulk-delete files older than timestamp |

---

## GitHub Connector

| Action | Description |
|--------|-------------|
| `ensurePipelineRepo()` | Auto-creates the pipeline repo from template on connect |
| `listWorkflowRuns(owner, repo, opts?)` | Lists recent workflow runs |
| `fetchRunLogs(owner, repo, runId)` | Fetches logs for a failed run |
| `commitFile(owner, repo, path, content, message)` | Commits a file to the pipeline repo |
| `setupWebhook(owner, repo, url, secret, events?)` | Registers a GH webhook for workflow_run events |
| `createRepoFromTemplate(...)` | Creates a repo from any template |
| `dispatchWorkflow(...)` | Triggers a workflow_dispatch |
| `listRepos`, `listIssues`, `listPRs`, `searchCode` | Standard GH API actions |

---

## Invocation Paths

| Path | How |
|------|-----|
| **Agent call** | Subagent with `agentType: 'video'` calls `edit_video` tool — the agent chooses edits based on natural language |
| **Direct tool call** | LLM calls `edit_video` via AI SDK adapter in any chat |
| **Workflow engine** | "Video Edit" step in a workflow run |
| **API** | POST to workflow_dispatch directly from any code |

### Example Agent Prompts

```
"Trim the last 30 seconds of my screen recording and speed it up 2x"
→ Agent generates manifest with trim + speed ops, calls edit_video

"Add a watermark to the top-right of this video"
→ Agent generates overlay operation

"Take these 3 clips and concatenate them"
→ Agent uses concat operations
```

---

## Auto-Repo Creation

When the user connects their GitHub account, `exchangeCode()` automatically calls `ensurePipelineRepo()`:

1. Checks if `raw-code-video-pipeline` exists in the user's repos
2. If not, calls `POST /repos/raw-code/video-pipeline-template/generate` to create a private copy
3. Stores `{ pipelineRepo: "user/raw-code-video-pipeline" }` in the token metadata
4. Subsequent `edit_video` calls can read the repo name from metadata instead of requiring manual input

The pipeline repo name is stored in `oauth_tokens.metadata` under the `pipelineRepo` key. Access it via:

```typescript
const meta = await connector.getTokenMetadata();
const repo = meta.pipelineRepo; // "user/raw-code-video-pipeline"
const [owner, repoName] = repo.split('/');
```

---

## Smart Auto-Retry

When a pipeline run fails and `retryOnFailure: true`, `edit_video`:

1. Fetches the run logs via `GET /repos/{owner}/{repo}/actions/runs/{runId}/logs`
2. Scans the log for error patterns to classify the failure

| Classification | Examples | Action |
|---------------|----------|--------|
| **Transient** | `Connection reset`, `Timeout`, `Cannot allocate memory`, `Broken pipe`, `Rate limit` | Retry (up to `maxRetries`) |
| **Permanent** | `Invalid data`, `Unknown encoder`, `No such file`, `Invalid argument` | Fail immediately, return `errorLog` |
| **Unknown** | FFmpeg exit code, signal | Retry with warning |

If the error is permanent, the tool returns `status: "failed"` with the first 2000 chars of the error log attached. This avoids wasting retries on broken manifests while still recovering from transient infrastructure issues.

**Pattern definitions** — stored as regex arrays in `edit-video.ts`:

```typescript
const TRANSIENT_PATTERNS = [/Connection reset/i, /Timeout/i, ...];
const PERMANENT_PATTERNS = [/Invalid data/i, /Unknown encoder/i, ...];
```

---

## Webhook-Based Completion (No Polling)

Instead of polling the GH API (which uses rate limits and introduces delay), you can set up a webhook that notifies your server instantly when a workflow run completes.

### One-Time Setup

Call `setupWebhook` on the GitHub connector (via action handler or directly):

```typescript
await connector.setupWebhook({
  owner: "my-user",
  repo: "raw-code-video-pipeline",
  url: "https://my-app.com/webhooks/github",
  secret: process.env.GITHUB_WEBHOOK_SECRET, // optional, for HMAC verification
  events: ["workflow_run"],
});
```

This registers a webhook that POSTs to `/webhooks/github` whenever a workflow run completes.

### Server Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /webhooks/github` | Receives GH `workflow_run` events. Verifies HMAC signature, matches run to registered job, calls callback URL |
| `POST /webhooks/github/jobs` | Registration — stores `{jobId, runId, repoOwner, repoName, callbackUrl}` for webhook lookup |

### How It Works

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
      │                                  │      workflow_run: {...}│
      │                                  │      repository: {...} } │
      │                                  │                         │
      │                                  ├── Match runId to job    │
      │                                  ├── POST callbackUrl ────►│ (or resolves deferred)
      │                                  │   { conclusion, jobId } │
```

### Using with `edit_video`

Set `webhookRegisterUrl` on the tool input:

```typescript
editVideoTool.execute({
  manifest: {...},
  sourceFileId: "1abc...",
  accessToken: "ghp_...",
  repoOwner: "my-user",
  repoName: "raw-code-video-pipeline",
  webhookRegisterUrl: "http://localhost:3001/webhooks/github/jobs",
  callbackUrl: "http://localhost:3001/webhooks/github/callback",
})
```

When provided, `edit_video` POSTs job registration to the server immediately after dispatch. When the pipeline completes, the webhook triggers the callback URL — no polling needed.

### HMAC Verification

If `GITHUB_WEBHOOK_SECRET` is set, the server verifies each webhook payload using `sha256` HMAC before processing:

```typescript
const sig = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature));
```

Invalid signatures return `401 Unauthorized`.

---

## Commit Manifests to Repo

After a successful pipeline run, you can commit the manifest + result to the pipeline repo for audit:

```typescript
await connector.commitFile({
  owner: "my-user",
  repo: "raw-code-video-pipeline",
  path: `runs/${jobId}.json`,
  content: JSON.stringify({ jobId, manifest, outputFileId, completedAt }, null, 2),
  message: `Pipeline result: ${jobId}`,
  branch: "main",
});
```

This creates (or updates) `runs/{jobId}.json` in the pipeline repo with a record of every run.

---

## File Reference

| File | Purpose |
|------|---------|
| `packages/tool-runtime/src/video/manifest.ts` | Effect Schema for all operation types + manifest container |
| `packages/tool-runtime/src/video/ffmpeg-builder.ts` | `buildCommands(manifest) → FfmpegCommand[]` |
| `packages/tool-runtime/src/video/edit-video.ts` | `edit_video` tool — dispatch + wait + retry |
| `packages/tool-runtime/src/video/poll-render-job.ts` | `poll_render_job` — step-level progress via GH API |
| `packages/tool-runtime/src/video/preview-video.ts` | `preview_video` — thumbnail + preview |
| `packages/tool-runtime/src/video/render-video.ts` | `render_video` (stub for legacy) |
| `packages/tool-runtime/src/video/export-video.ts` | `export_video` (stub) |
| `packages/tool-runtime/src/builtins.ts` | Global tool registration |
| `packages/subagent/src/personalities.ts` | Agent personalities with video tool scope |
| `server/src/connectors/drive.ts` | Google Drive connector |
| `server/src/connectors/github.ts` | GitHub connector |
| `template-repo/process.sh` | Pipeline orchestrator (Python FFmpeg builder) |
| `template-repo/.github/workflows/render-video.yml` | GH Actions workflow |
| `src/types/workflow.ts` | Workflow step types (`video_edit`) |
| `src/components/workflow/primitive-configs/VideoEditConfig.tsx` | Step config UI |
| `src/data/workflowTemplates.ts` | "Video Edit" template |
| `docs/drive-gh-actions-video-pipeline.md` | Original design doc |

---

## Security

| Concern | Mitigation |
|---------|------------|
| Drive token exposure | Short-lived access tokens (1h). Refresh token encrypted in DB. |
| GH token exposure | Passed as workflow `inputs` (masked in logs). |
| Drive scope | `drive.file` — only files the app created. |
| Malicious manifest | FFmpeg filter args parsed by builder, no shell interpolation. |
| Runner timeout | `timeout-minutes: 120` prevents runaway jobs. |
| File size | 14 GB SSD on runner. Larger: stream-copy segments. |

---

## Edge Cases

| Issue | Workaround |
|-------|-----------|
| Drive token expires (1h) | Refresh token stored in DB. Auto-refresh before dispatch. |
| GH runner cold start | ~30s. Acceptable for async editing. |
| Large video >10 GB | Split into segments; process sequentially. |
| 6h runner limit | Chained workflows for long edits. |
| No GPU on free runners | `-preset ultrafast` for drafts, `-preset medium` for final. |
| Drive rate limits | 10 queries/sec/user. Batch operations. |
