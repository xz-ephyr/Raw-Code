import { Effect, Duration, Schedule, Schema } from 'effect';
import { make } from '../tool/make';
import { EditManifest } from './manifest';
import { buildCommands } from './ffmpeg-builder';
import { dispatchWorkflow, fetchRunLogs, pollRunStatus } from './github-dispatch';
import { classifyError } from './ffmpeg-errors';

const MAX_RETRIES = 3;

const RetryPolicy = {
  dispatch: Schedule.addDelay(Schedule.recurs(MAX_RETRIES - 1), () => Duration.seconds(3)),
  pollDelayed: (ms: number) =>
    Schedule.addDelay(
      Schedule.recurWhile<Error>((e) => e.message === 'Not yet completed'),
      () => Duration.millis(ms),
    ),
};

const inputSchema = Schema.Struct({
  manifest: EditManifest,
  sourceFileId: Schema.String,
  accessToken: Schema.String,
  repoOwner: Schema.String,
  repoName: Schema.String,
  workflowFileName: Schema.optional(Schema.String),
  branch: Schema.optional(Schema.String),
  callbackUrl: Schema.optional(Schema.String),
  idempotencyKey: Schema.optional(Schema.String),
  wait: Schema.optional(Schema.Boolean),
  pollIntervalMs: Schema.optional(Schema.Number),
  pollTimeoutMs: Schema.optional(Schema.Number),
  retryOnFailure: Schema.optional(Schema.Boolean),
  maxRetries: Schema.optional(Schema.Number),
  cleanupOldFiles: Schema.optional(Schema.Boolean),
  cleanupMaxAgeDays: Schema.optional(Schema.Number),
  webhookRegisterUrl: Schema.optional(Schema.String),
});

const outputSchema = Schema.Struct({
  jobId: Schema.String,
  dispatchId: Schema.Number,
  status: Schema.Literal('pending', 'processing', 'completed', 'failed'),
  workflowUrl: Schema.String,
  manifestPreview: Schema.String,
  estimatedCommands: Schema.Number,
  finalStatus: Schema.optional(Schema.String),
  finalConclusion: Schema.optional(Schema.String),
  outputUrl: Schema.optional(Schema.String),
  errorLog: Schema.optional(Schema.String),
});

function generateId(): string {
  return crypto.randomUUID();
}

export const editVideoTool = make({
  description: 'Edit a video by dispatching an FFmpeg pipeline to GitHub Actions. Provide the edit manifest, Google Drive source file ID, and GitHub repository details. Set wait=true to block until the pipeline completes.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      manifest: {
        type: 'object',
        description: 'Edit manifest describing all video operations',
      },
      sourceFileId: {
        type: 'string',
        description: 'Google Drive file ID of the source video',
      },
      accessToken: {
        type: 'string',
        description: 'GitHub personal access token with repo scope, or OAuth token',
      },
      repoOwner: {
        type: 'string',
        description: 'GitHub repository owner (user or org)',
      },
      repoName: {
        type: 'string',
        description: 'GitHub repository name containing the video pipeline workflow',
      },
      workflowFileName: {
        type: 'string',
        description: 'Workflow YAML filename (default: render-video.yml)',
      },
      branch: {
        type: 'string',
        description: 'Branch to run the workflow on (default: main)',
      },
      callbackUrl: {
        type: 'string',
        description: 'Optional URL to POST completion status to',
      },
      idempotencyKey: {
        type: 'string',
        description: 'Optional idempotency key to prevent duplicate dispatches',
      },
      wait: {
        type: 'boolean',
        description: 'If true, poll until the pipeline completes (up to pollTimeoutMs)',
      },
      pollIntervalMs: {
        type: 'number',
        description: 'Polling interval in ms (default: 5000)',
      },
      pollTimeoutMs: {
        type: 'number',
        description: 'Max time to wait in ms (default: 600000 = 10 min)',
      },
      retryOnFailure: {
        type: 'boolean',
        description: 'If true and the workflow run fails, retry the entire pipeline',
      },
      maxRetries: {
        type: 'number',
        description: 'Max retries on failure (default: 2, only if retryOnFailure=true)',
      },
      cleanupOldFiles: {
        type: 'boolean',
        description: 'If true, delete old processed files from Drive before dispatching',
      },
      cleanupMaxAgeDays: {
        type: 'number',
        description: 'Delete Drive files older than this many days (default: 7)',
      },
      webhookRegisterUrl: {
        type: 'string',
        description: 'Server URL to POST job registration for webhook-based completion (e.g. http://localhost:3001/webhooks/github/jobs)',
      },
    },
    required: ['manifest', 'sourceFileId', 'accessToken', 'repoOwner', 'repoName'],
  },
  execute: (input) =>
    Effect.gen(function* () {
      const jobId = generateId();
      const workflowFileName = input.workflowFileName ?? 'render-video.yml';
      const branch = input.branch ?? 'main';
      const manifestJson = JSON.stringify(input.manifest);
      const ffmpegCommands = buildCommands(input.manifest);

      yield* Effect.log(`[edit-video] Dispatching workflow for job ${jobId}`);
      yield* Effect.log(`[edit-video] Manifest has ${input.manifest.operations.length} operations → ${ffmpegCommands.length} FFmpeg commands`);

      const maxRetries = input.retryOnFailure ? (input.maxRetries ?? 2) : 0;

      const dispatchResult = yield* Effect.retry(
        dispatchWorkflow({
          repoOwner: input.repoOwner,
          repoName: input.repoName,
          workflowFileName,
          branch,
          accessToken: input.accessToken,
          sourceFileId: input.sourceFileId,
          manifestJson,
          callbackUrl: input.callbackUrl,
        }),
        RetryPolicy.dispatch,
      ).pipe(Effect.timeout(30_000));

      const workflowUrl = dispatchResult.id
        ? `https://github.com/${input.repoOwner}/${input.repoName}/actions/runs/${dispatchResult.id}`
        : dispatchResult.url;

      // Register with webhook server for notification-based completion
      if (input.webhookRegisterUrl && dispatchResult.id) {
        yield* Effect.tryPromise({
          try: () =>
            fetch(input.webhookRegisterUrl!, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobId,
                runId: dispatchResult.id,
                repoOwner: input.repoOwner,
                repoName: input.repoName,
                callbackUrl: input.callbackUrl || `${input.webhookRegisterUrl?.replace(/\/jobs$/, '')}/callback`,
              }),
              signal: AbortSignal.timeout(5000),
            }),
          catch: (e) => {
            console.warn(`[edit-video] Webhook registration failed: ${e instanceof Error ? e.message : String(e)}`);
            return undefined as any;
          },
        });
      }

      const baseOutput = {
        jobId,
        dispatchId: dispatchResult.id,
        workflowUrl,
        manifestPreview: input.manifest.operations.length > 3
          ? `${input.manifest.operations.slice(0, 3).map((o) => o.type).join(', ')}...`
          : input.manifest.operations.map((o) => o.type).join(', '),
        estimatedCommands: ffmpegCommands.length,
      };

      if (!input.wait || !dispatchResult.id) {
        return { ...baseOutput, status: 'pending' as const };
      }

      // Wait mode: poll until completed, with optional retry on failure
      yield* Effect.log(`[edit-video] Waiting for pipeline completion (job ${jobId}, run ${dispatchResult.id})`);

      const interval = input.pollIntervalMs ?? 5000;
      const timeout = input.pollTimeoutMs ?? 600_000;
      const startedAt = Date.now();

      const poll = Effect.gen(function* () {
        const gh = yield* pollRunStatus(input.repoOwner, input.repoName, dispatchResult.id, input.accessToken);
        if (gh.status === 'completed') {
          const success = gh.conclusion === 'success';
          return {
            finalStatus: gh.status,
            finalConclusion: gh.conclusion ?? undefined,
            outputUrl: success ? workflowUrl : undefined,
            needsRetry: maxRetries > 0 && !success,
          };
        }
        const elapsed = Date.now() - startedAt;
        if (elapsed >= timeout) {
          return yield* Effect.fail(new Error(`Polling timed out after ${timeout}ms`));
        }
        return yield* Effect.fail(new Error('Not yet completed'));
      });

      let polled = yield* Effect.retry(poll, RetryPolicy.pollDelayed(interval)).pipe(
        Effect.timeout(timeout + 5000),
      );

      // Retry loop on pipeline failure (with smart classification if logs available)
      let attempts = 1;
      while (polled.needsRetry && attempts <= maxRetries) {
        // Fetch logs to classify the error
        const logs = yield* fetchRunLogs(input.repoOwner, input.repoName, dispatchResult.id, input.accessToken).pipe(
          Effect.orElseSucceed(() => ''),
        );
        const errorType = classifyError(logs);

        if (errorType === 'permanent') {
          yield* Effect.log(`[edit-video] Permanent error detected — not retrying`);
          return { ...baseOutput, status: 'failed' as const, finalStatus: 'completed', finalConclusion: 'failure', errorLog: logs.slice(0, 2000) };
        }

        if (errorType === 'unknown' && attempts < maxRetries) {
          yield* Effect.log(`[edit-video] Unknown error — retrying (attempt ${attempts}/${maxRetries})`);
        } else if (errorType === 'transient') {
          yield* Effect.log(`[edit-video] Transient error — retrying (attempt ${attempts}/${maxRetries})`);
        }

        yield* Effect.log(`[edit-video] Pipeline failed (attempt ${attempts}/${maxRetries}), retrying...`);
        const retryResult: { id: number; url: string } = yield* Effect.retry(
          dispatchWorkflow({
            repoOwner: input.repoOwner,
            repoName: input.repoName,
            workflowFileName,
            branch,
            accessToken: input.accessToken,
            sourceFileId: input.sourceFileId,
            manifestJson,
            callbackUrl: input.callbackUrl,
          }),
          RetryPolicy.dispatch,
        );
        baseOutput.workflowUrl = retryResult.id
          ? `https://github.com/${input.repoOwner}/${input.repoName}/actions/runs/${retryResult.id}`
          : retryResult.url;

        polled = yield* Effect.retry(poll, RetryPolicy.pollDelayed(interval)).pipe(
          Effect.timeout(timeout + 5000),
        );
        attempts++;
      }

      return { ...baseOutput, status: 'completed' as const, ...polled };
    }),
});
