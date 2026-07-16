# Google Drive + GitHub Actions Video Editing Pipeline

## Overview

Serverless video editing system that uses a user's Google Drive as object storage
and GitHub Actions as a free compute runner with FFmpeg. The system is invoked
via agent tool calls, standalone tool execution, or the workflow engine — and
runs on a separate ephemeral GitHub repository, never on the user's own repos.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your App (raw-code)                      │
│                                                             │
│  Agent / Tool / Workflow                                     │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────┐    ┌──────────────────┐                   │
│  │ edit-video   │───►│ Drive Connector  │                   │
│  │ (Effect tool)│    │ (OAuth2 + API)   │                   │
│  └──────────────┘    └────────┬─────────┘                   │
│                               │                              │
│                               ▼                              │
│                        Upload source video                   │
│                        to user's Google Drive                │
└───────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
                   GitHub API (dispatch workflow)
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│              GitHub Actions (ephemeral private repo)         │
│                                                              │
│  ┌─────────────┐    ┌──────────┐    ┌──────────────────┐    │
│  │ Download    │───►│ FFmpeg   │───►│ Upload result    │    │
│  │ from Drive  │    │ pipeline │    │ to Drive         │    │
│  └─────────────┘    └──────────┘    └──────────────────┘    │
│                                                              │
│  FFmpeg operations: trim, concat, crop, scale, overlay,      │
│  drawtext, fade, speed-ramp, xfade-transitions, GIF, audio   │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
                   Callback / Polling
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│  App retrieves processed file from user's Google Drive       │
│  Notifies agent/tool/workflow with result URL                │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Storage Layer — Google Drive

### 2.1 Why Google Drive

| Requirement | Google Drive |
|-------------|-------------|
| Free tier | 15 GB per user (included with every Google account) |
| API | RESTful, mature, well-documented |
| Auth | OAuth 2.0 — already implemented in this codebase |
| Existing infra | `GoogleConnectorService` in `server/src/connectors/google-base.ts` |
| Media support | Handles large files up to 5 TB |
| Permissions | App-scoped: only files created by the app (`drive.file` scope) |

### 2.2 OAuth Scope

```typescript
// Minimal scope — only files the app creates or opens
'https://www.googleapis.com/auth/drive.file'
```

This scope:
- Does **not** give access to the user's entire Drive
- Only allows reading/writing files created by this application
- Files appear in "Shared with me" and a dedicated app folder

### 2.3 Google Drive Connector

Extends the existing `GoogleConnectorService` base class:

```typescript
// server/src/connectors/drive.ts
export class GoogleDriveConnectorService extends GoogleConnectorService {
  readonly provider = 'google-drive'
  readonly baseUrl = 'https://www.googleapis.com/drive/v3'

  protected get googleScopes(): string[] {
    return ['https://www.googleapis.com/auth/drive.file']
  }

  protected get identityUrl(): string {
    return 'https://www.googleapis.com/drive/v3/about?fields=user'
  }
}
```

### 2.4 Drive API Operations

#### Upload file

```
POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
Authorization: Bearer <access_token>

--boundary
Content-Type: application/json; charset=UTF-8

{ "name": "source-video.mp4", "parents": ["appDataFolder"] }

--boundary
Content-Type: video/mp4

<binary data>
```

Response:
```json
{
  "id": "1abc123...",
  "name": "source-video.mp4",
  "size": "52428800",
  "webViewLink": "https://drive.google.com/..."
}
```

#### Download file

```
GET https://www.googleapis.com/drive/v3/files/<fileId>?alt=media
Authorization: Bearer <access_token>
```

#### Delete file (cleanup after processing)

```
DELETE https://www.googleapis.com/drive/v3/files/<fileId>
Authorization: Bearer <access_token>
```

---

## 3. Compute Layer — GitHub Actions

### 3.1 Why GitHub Actions

| Requirement | GitHub Actions |
|-------------|---------------|
| Free tier | 2000 min/month for public repos; 300 min/month for private |
| FFmpeg | Pre-installed on `ubuntu-latest`; latest via `apt-get`/`setup-ffmpeg` |
| Compute | 2-core CPU, 7 GB RAM, 14 GB SSD (ubuntu-latest) |
| Runner limit | 6 hours max per job — ample for video processing |
| Trigger | Workflow dispatch via REST API |

### 3.2 Job Flow

1. App dispatches workflow via `POST /repos/<owner>/<repo>/actions/workflows/<workflow>/dispatches`
2. Runner spins up, installs FFmpeg if needed
3. Runner downloads source video from Google Drive
4. Runner executes FFmpeg pipeline according to manifest
5. Runner uploads result(s) back to Google Drive
6. Runner calls callback or app polls Drive for completion

### 3.3 Workflow YAML Template

```yaml
name: Video Edit Pipeline

on:
  workflow_dispatch:
    inputs:
      sourceFileId:
        description: 'Google Drive file ID of source video'
        required: true
        type: string
      accessToken:
        description: 'OAuth access token for Google Drive'
        required: true
        type: string
      manifest:
        description: 'JSON edit manifest'
        required: true
        type: string
      callbackUrl:
        description: 'URL to notify on completion'
        required: false
        type: string

jobs:
  process-video:
    runs-on: ubuntu-latest
    timeout-minutes: 120

    steps:
      - name: Checkout templates
        uses: actions/checkout@v4

      - name: Setup FFmpeg
        uses: FedericoCarboni/setup-ffmpeg@v3

      - name: Verify FFmpeg
        run: ffmpeg -version

      - name: Download source from Google Drive
        run: |
          curl -H "Authorization: Bearer ${{ github.event.inputs.accessToken }}" \
            "https://www.googleapis.com/drive/v3/files/${{ github.event.inputs.sourceFileId }}?alt=media" \
            -o source.mp4

      - name: Process video
        run: |
          echo '${{ github.event.inputs.manifest }}' > manifest.json
          bash process.sh manifest.json

      - name: Upload result to Google Drive
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ github.event.inputs.accessToken }}" \
            -H "Content-Type: multipart/related" \
            -F "metadata={\"name\":\"output.mp4\",\"parents\":[\"appDataFolder\"]};type=application/json" \
            -F "media=@output.mp4;type=video/mp4" \
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"

      - name: Callback (optional)
        if: ${{ github.event.inputs.callbackUrl != '' }}
        run: |
          curl -X POST "${{ github.event.inputs.callbackUrl }}" \
            -H "Content-Type: application/json" \
            -d '{"status":"completed","fileId":"<output-file-id>"}'
```

---

## 4. FFmpeg Command Composer

### 4.1 Manifest Format

The edit manifest is a JSON document describing all video editing operations.
The orchestrator (`process.sh`) parses this and builds FFmpeg commands.

```json
{
  "version": 1,
  "output": {
    "filename": "edited-video.mp4",
    "codec": "libx264",
    "crf": 23,
    "resolution": "1920x1080",
    "fps": 30
  },
  "segments": [
    {
      "id": "intro",
      "type": "title",
      "text": "My Video Title",
      "duration": 3,
      "style": {
        "font": "Impact",
        "color": "white",
        "fontSize": 48
      }
    },
    {
      "id": "clip1",
      "type": "clip",
      "source": "source.mp4",
      "trim": { "start": "00:00:00", "end": "00:01:30" },
      "speed": 1.0,
      "crop": { "width": 1080, "height": 1080, "x": 420, "y": 0 },
      "filters": {
        "brightness": 0.05,
        "contrast": 1.1,
        "saturation": 1.2
      }
    },
    {
      "id": "transition",
      "type": "transition",
      "style": "fade",
      "duration": 0.5
    },
    {
      "id": "clip2",
      "type": "clip",
      "source": "source.mp4",
      "trim": { "start": "00:01:30", "end": "00:02:45" },
      "speed": 1.5,
      "watermark": {
        "image": "logo.png",
        "position": "top-right",
        "scale": 0.1
      }
    },
    {
      "id": "outro",
      "type": "clip",
      "source": "source.mp4",
      "trim": { "start": "00:05:00" },
      "subtitles": {
        "file": "captions.srt",
        "burn": true
      }
    }
  ],
  "audio": {
    "background": {
      "source": "music.mp3",
      "volume": 0.3,
      "fadeIn": 2,
      "fadeOut": 3
    },
    "normalize": true,
    "targetLUFS": -14
  }
}
```

### 4.2 FFmpeg Command Builder

The `process.sh` script translates the manifest into ordered FFmpeg pipeline
commands:

| Manifest Operation | FFmpeg Command / Filter |
|--------------------|------------------------|
| trim | `-ss <start> -to <end> -i <file> -c copy` |
| crop | `-vf "crop=<w>:<h>:<x>:<y>"` |
| scale | `-vf "scale=<w>:-2"` |
| speed (video) | `-vf "setpts=<factor>*PTS"` |
| speed (audio) | `-af "atempo=<factor>"` |
| overlay/watermark | `-vf "overlay=<x>:<y>"` |
| drawtext | `-vf "drawtext=text='...':font=...:fontsize=...:x=...:y=..."` |
| concat clips | `-f concat -safe 0 -i concat.txt -c copy` |
| xfade transition | `-vf "xfade=transition=fade:duration=0.5:offset=<t>"` |
| brightness/contrast | `-vf "eq=brightness=0.05:contrast=1.1"` |
| subtitles burn | `-vf "subtitles=captions.srt"` |
| audio normalize | `loudnorm=I=-14:LRA=11:TP=-1.5` |
| audio mix | `-filter_complex "[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2"` |
| chroma key | `-vf "colorkey=0x00FF00:0.1:0.2"` |
| GIF export | Palette generation + paletteuse two-pass |
| GPU encode | `-c:v h264_nvenc` (if GPU runner available) |

### 4.3 Supported Operations (v1)

| Category | Operations |
|----------|-----------|
| **Trim** | Start/end timecode, duration-based |
| **Concat** | Multi-clip merging, re-encode or stream-copy |
| **Transform** | Crop, scale, rotate, flip, pad |
| **Speed** | Setpts/atempo (0.25x–4x) |
| **Overlay** | Image watermark, picture-in-picture |
| **Text** | Title cards, lower thirds, captions (SRT/ASS burn) |
| **Color** | Brightness, contrast, saturation, gamma, LUT grading |
| **Chroma Key** | Green/blue screen removal |
| **Transitions** | Fade (xfade), crossfade |
| **Audio** | Volume, normalize (EBU R128), fade, mix, background music |
| **Export** | MP4 (H.264), WebM (VP9), MOV, GIF |

---

## 5. Tool Integration (Effect.ts)

### 5.1 New Tool: `edit_video`

```typescript
// packages/tool-runtime/src/video/edit-video.ts

import { Effect, Schema } from 'effect'
import { make } from '../tool/make'

const EditOperation = Schema.Struct({
  type: Schema.Literal('trim', 'crop', 'scale', 'concat', 'speed',
    'overlay', 'text', 'transition', 'color', 'chroma', 'audio', 'gif'),
  // ... operation-specific params
})

const inputSchema = Schema.Struct({
  sourceFileId: Schema.String,
  operations: Schema.Array(EditOperation),
  outputFormat: Schema.optional(Schema.String),
  callbackUrl: Schema.optional(Schema.String),
})

const outputSchema = Schema.Struct({
  jobId: Schema.String,
  status: Schema.Literal('pending', 'processing', 'completed', 'failed'),
  outputFileId: Schema.optional(Schema.String),
  outputUrl: Schema.optional(Schema.String),
})

export const editVideoTool = make({
  description: 'Edit a video using GitHub Actions + FFmpeg, stored in Google Drive.',
  input: inputSchema,
  output: outputSchema,
  execute: (input) =>
    Effect.gen(function* () {
      // 1. Generate edit manifest from operations
      // 2. Dispatch GH Actions workflow with manifest + fileId + token
      // 3. Return jobId for polling
    }),
})
```

### 5.2 How to Use It

#### Prerequisites

| What | How |
|------|-----|
| Google account | Connect Google Drive OAuth in settings → grants `drive.file` scope |
| GitHub account | Connect GitHub OAuth in settings, or provide a PAT with `repo` scope |
| Pipeline repo | A private repo from the template (`raw-code/video-pipeline-template`) containing `process.sh` and `.github/workflows/render-video.yml` |

#### End-to-End Flow

```
You (Agent/LLM)                App                        GitHub Actions Runner
      │                         │                               │
      │  "edit this video"      │                               │
      ├────────────────────────►│                               │
      │                         │                               │
      │                         ├─ Upload source to Drive       │
      │                         │  (via Drive connector)        │
      │                         │                               │
      │                         ├─ Build EditManifest JSON      │
      │                         │  (trim, overlay, concat, ...) │
      │                         │                               │
      │                         ├─ Call edit_video tool         │
      │                         │  POST workflow_dispatch ──────►│
      │                         │                               │
      │                         │                     ┌─────────┤
      │                         │                     │ 1. Download source from Drive
      │                         │                     │ 2. process.sh parses manifest
      │                         │                     │ 3. Run FFmpeg ops sequentially
      │                         │                     │ 4. Upload result to Drive
      │                         │                     │ 5. POST callback (optional)
      │                         │                     └─────────┤
      │                         │                               │
      │  ← "job abc-123"        │                               │
      │  ← workflow URL         │                               │
      │                         │                               │
      │  poll_render_job ──────►│                               │
      │  ← "completed"          │                               │
      │  ← Drive file ID        │                               │
```

#### Step-by-Step

**1. Upload source video to Google Drive**

Via the Drive connector or manually. The resulting `fileId` (e.g. `1abc123...`) is the source you pass to `edit_video`.

**2. Build the edit manifest**

A JSON document describing every operation. Example:

```json
{
  "version": 1,
  "output": { "filename": "final.mp4" },
  "operations": [
    { "type": "trim", "source": "source.mp4", "start": "0", "duration": "10" },
    { "type": "scale", "width": 1920 },
    { "type": "drawtext", "text": "Hello", "fontSize": 48, "color": "white", "x": "100", "y": "100" },
    { "type": "audiomix", "source": "bgm.mp3", "volume": 0.3 },
    { "type": "concat", "sources": ["intro.mp4", "main.mp4", "outro.mp4"] },
    { "type": "gif", "source": "clip.mp4", "width": 480, "fps": 15 }
  ]
}
```

Operations stack sequentially — each output feeds into the next.

**3. Call the tool**

Configured via agent prompt, direct LLM tool call, or SDK:

```typescript
const result = await editVideoTool.execute({
  manifest,
  sourceFileId: "1abc123...",
  accessToken: "ghp_...",
  repoOwner: "my-user",
  repoName: "video-pipeline",
})
```

Returns:

```json
{
  "jobId": "550e8400-...",
  "status": "pending",
  "workflowUrl": "https://github.com/my-user/video-pipeline/actions/runs/12345",
  "manifestPreview": "trim, scale, drawtext...",
  "estimatedCommands": 6
}
```

**4. Monitor progress**

Use the returned `workflowUrl` to watch the GitHub Actions run in a browser, or poll with `poll_render_job`. The runner updates its status as it progresses through steps.

**5. Get the result**

On completion, the processed file is uploaded back to Google Drive (same folder: `appDataFolder`). The callback URL (if provided) receives:

```json
{ "status": "completed", "sourceFileId": "...", "runId": "12345" }
```

From there, the app can download and present the result.

#### Three Invocation Paths

| Path | How |
|------|-----|
| **Agent call** | Subagent calls `edit_video` tool (registered as `edit_video` in `builtins.ts`) — the agent decides the edits based on your natural language prompt |
| **Direct tool call** | LLM tool call via the AI SDK adapter — works in any chat that has tool access |
| **Workflow engine** | Workflow runner creates a "Video Edit" step that calls the Drive connector + GH Actions dispatch — composable with other steps |

#### Example Agent Prompts

```
"Trim the last 30 seconds of my screen recording and speed it up 2x"
→ Agent generates a manifest with trim + speed ops, calls edit_video

"Add a watermark to the top-right of this video"
→ Agent generates overlay operation, passes the Drive file ID

"Take these 3 clips and concatenate them with a crossfade between each"
→ Agent uses concat operations, sets reencode=true for the transition
```

### 5.3 Integration Points

```
packages/tool-runtime/src/video/
├── edit-video.ts         ← NEW: main tool
├── render-video.ts       ← existing (stub)
├── export-video.ts       ← existing (stub)
└── preview-video.ts      ← existing (stub)

packages/tool-runtime/src/builtins.ts
├── import { editVideoTool } from './video/edit-video'
├── edit_video: editVideoTool,

server/src/connectors/
├── google-base.ts        ← existing (parent class)
├── gmail.ts              ← existing (reference pattern)
├── drive.ts              ← NEW: Google Drive connector
└── registry.ts           ← register 'google-drive'
```

---

## 6. GitHub Repo Management

### 6.1 Separate Private Repo

The user's source repos are never touched. Flow:

1. App maintains a **template repo** (`raw-code/video-pipeline-template`)
   - Contains: `process.sh`, FFmpeg helper scripts, workflow YAML
2. When user connects GitHub (OAuth), app creates a **new private repo** from the template:
   ```
   POST /repos/:owner/:repo/generate
   ```
3. Workflows run on this ephemeral repo
4. User can inspect/edit the repo if desired

### 6.2 Authentication

- **GitHub App** (recommended): Single app installation. Creates repos on
  behalf of the user. No per-user secrets to manage.
- **OAuth fallback**: Use user's PAT or OAuth token. Partially supported via
  the existing `github.ts` connector.

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Google Drive token exposure | Use short-lived access tokens (1h). Store refresh token encrypted in DB. |
| GH Actions secret exposure | Manifest and tokens passed as `inputs` (masked in logs). |
| Unauthorized Drive access | Scope is `drive.file` — only files the app created. |
| Malicious manifest | Sanitize FFmpeg filter strings. No shell interpolation — use FFmpeg's `-filter_complex` with parsed args. |
| Runner timeout | `timeout-minutes: 120` prevents runaway jobs. |
| File size limits | GitHub Actions 14 GB SSD. Larger files: stream-copy segments. |

---

## 8. Implementation Plan (Phased)

### Phase 1: Foundation
- Create `server/src/connectors/drive.ts` — Google Drive connector
- Add `drive.file` scope to Google OAuth
- Implement Drive API helpers: upload, download, delete
- Register connector in registry

### Phase 2: FFmpeg Composer
- Build JSON manifest schema
- Write `process.sh` — manifest → FFmpeg command builder
- Create template repo with workflow YAML
- Test locally (manual FFmpeg calls)

### Phase 3: Tool + GitHub Integration
- Create `edit-video.ts` Effect tool
- Implement GH Actions dispatch from tool execution
- Wire OAuth token flow from DB → workflow dispatch
- Register tool in `builtins.ts`

### Phase 4: Agent + Workflow
- Subagent bridge: allow agents to call `edit_video`
- Workflow engine integration: "Video Edit" run step type
- Polling/callback mechanism for completion

### Phase 5: Polish
- Preview generation (thumbnail extraction)
- Progress reporting via GH Actions API
- Error handling + retry logic
- Cleanup old files from Drive

---

## 9. Cost Analysis

| Component | Cost |
|-----------|------|
| Google Drive storage | Free (15 GB per user) |
| GitHub Actions minutes | Free-tier: 300 min/mo (private) or 2000 min/mo (public template repo) |
| Google Drive API | Free (within quota: 10M queries/day) |
| GitHub API | Free |
| **Total** | **$0/month** for prototyping and light production |

---

## 10. Edge Cases & Limitations

| Issue | Workaround |
|-------|-----------|
| Google Drive OAuth token expires (1h) | Use refresh token to get new access token. Store refresh token in DB. |
| GH Actions runner cold start | ~30s. Acceptable for non-real-time editing. |
| Large video files (>10 GB) | Split into segments; process sequentially; stream-copy when possible. |
| 6-hour runner limit | Break long edits into chained workflows. |
| No GPU on free runners | CPU encoding is slower. Use `-preset ultrafast` for drafts, `-preset medium` for final. |
| Google Drive rate limits | 10 queries/second/user. Batch operations where possible. |
