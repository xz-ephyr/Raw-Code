import { Effect, Duration, Schedule, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import type { ToolExecuteContext } from '../types';

interface JobStep {
  name: string;
  status: string;
  conclusion: string | null;
}

interface JobInfo {
  status: string;
  conclusion: string | null;
  steps?: JobStep[];
}

const inputSchema = Schema.Struct({
  jobId: Schema.String,
  sessionID: Schema.optional(Schema.String),
  workflowUrl: Schema.optional(Schema.String),
  accessToken: Schema.optional(Schema.String),
  repoOwner: Schema.optional(Schema.String),
  repoName: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.Number),
});

const outputSchema = Schema.Struct({
  jobId: Schema.String,
  status: Schema.String,
  progress: Schema.Number,
  workflowUrl: Schema.optional(Schema.String),
  outputUrl: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  currentStep: Schema.optional(Schema.String),
  stepCount: Schema.optional(Schema.Number),
  completedSteps: Schema.optional(Schema.Number),
  steps: Schema.optional(Schema.Array(Schema.Struct({
    name: Schema.String,
    status: Schema.String,
    conclusion: Schema.optional(Schema.String),
  }))),
});

const jobStore = new Map<string, { startedAt: number; completedAt: number | null }>();

function checkGithubRunStatus(owner: string, repo: string, runId: number, token: string): Effect.Effect<{ status: string; conclusion: string | null }, Error> {
  return Effect.tryPromise({
    try: async () => {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'raw-code-poll-tool',
          },
        },
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const data = await res.json();
      return { status: data.status as string, conclusion: data.conclusion as string | null };
    },
    catch: (e) => new Error(`Failed to check GH run: ${e instanceof Error ? e.message : String(e)}`),
  });
}

function fetchJobSteps(owner: string, repo: string, runId: number, token: string): Effect.Effect<JobInfo, Error> {
  return Effect.tryPromise({
    try: async () => {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'raw-code-poll-tool',
          },
        },
      );
      if (!res.ok) throw new Error(`GH jobs API error: ${res.status}`);
      const data = await res.json();
      const job = data.jobs?.[0];
      if (!job) return { status: 'unknown', conclusion: null };
      return {
        status: job.status,
        conclusion: job.conclusion,
        steps: (job.steps || []).map((s: any) => ({
          name: s.name,
          status: s.status,
          conclusion: s.conclusion,
        })),
      };
    },
    catch: (e) => new Error(`Failed to fetch job steps: ${e instanceof Error ? e.message : String(e)}`),
  });
}

function describeGhStatus(s: string, conclusion: string | null): string {
  if (s === 'completed') return conclusion === 'success' ? 'completed' : conclusion ?? 'failed';
  if (s === 'in_progress' || s === 'queued') return 'processing';
  return s;
}

function ghProgress(s: string, _conclusion: string | null): number {
  if (s === 'completed') return 100;
  if (s === 'in_progress') return 50;
  if (s === 'queued') return 10;
  return 0;
}

export const pollRenderJobTool = make({
  description: 'Poll the status of a video render job. Provide workflowUrl + repo info to check real GitHub Actions run status, or just jobId for simulated polling.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      jobId: { type: 'string', description: 'The job ID returned from render_video or edit_video' },
      sessionID: { type: 'string', description: 'Optional session ID to scope the lookup' },
      workflowUrl: { type: 'string', description: 'GH Actions workflow run URL for real status check' },
      accessToken: { type: 'string', description: 'GH access token for API call' },
      repoOwner: { type: 'string', description: 'GitHub repo owner' },
      repoName: { type: 'string', description: 'GitHub repo name' },
      runId: { type: 'number', description: 'GitHub Actions run ID' },
    },
    required: ['jobId'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Polling render job: ${input.jobId}`);
      const sessionID = input.sessionID ?? context.sessionID;

      // Real GH API check if credentials provided
      if (input.runId && input.repoOwner && input.repoName && input.accessToken) {
        const gh = yield* checkGithubRunStatus(input.repoOwner, input.repoName, input.runId, input.accessToken);
        const status = describeGhStatus(gh.status, gh.conclusion);
        const progress = ghProgress(gh.status, gh.conclusion);

        // Fetch step-level progress
        let currentStep: string | undefined;
        let stepCount: number | undefined;
        let completedSteps: number | undefined;
        let steps: { name: string; status: string; conclusion?: string }[] | undefined;

        if (gh.status === 'in_progress' || gh.status === 'completed') {
          const jobInfo: JobInfo = yield* Effect.retry(
            fetchJobSteps(input.repoOwner, input.repoName, input.runId, input.accessToken),
            Schedule.addDelay(Schedule.recurs(2), () => Duration.millis(500)),
          ).pipe(Effect.orElseSucceed(() => ({ status: '', conclusion: null } as JobInfo)));

          if (jobInfo.steps) {
            steps = jobInfo.steps.map((s: { name: string; status: string; conclusion: string | null }) => ({
              name: s.name,
              status: s.status,
              conclusion: s.conclusion ?? undefined,
            }));
            stepCount = steps.length;
            completedSteps = steps.filter((s) => s.status === 'completed').length;
            const runningStep = steps.find((s) => s.status === 'in_progress');
            currentStep = runningStep?.name;
          }
        }

        const outputUrl = gh.status === 'completed' && gh.conclusion === 'success'
          ? `https://github.com/${input.repoOwner}/${input.repoName}/actions/runs/${input.runId}`
          : undefined;
        const error = gh.status === 'completed' && gh.conclusion && gh.conclusion !== 'success'
          ? `Workflow ${gh.conclusion}`
          : undefined;
        const output = {
          jobId: input.jobId, status, progress, workflowUrl: input.workflowUrl, outputUrl, error,
          currentStep, stepCount, completedSteps, steps,
        };
        putToolOutput(sessionID, context.toolCallID, 'poll_render_job', input, output);
        return output;
      }

      // Fallback: simulated polling with step progress
      const job = jobStore.get(input.jobId);
      if (!job) {
        jobStore.set(input.jobId, { startedAt: Date.now(), completedAt: null });
        const output = {
          jobId: input.jobId, status: 'processing' as const, progress: 0, workflowUrl: input.workflowUrl,
          currentStep: 'Queued', stepCount: 5, completedSteps: 0,
          steps: [
            { name: 'Download', status: 'queued' },
            { name: 'Process', status: 'queued' },
            { name: 'Encode', status: 'queued' },
            { name: 'Upload', status: 'queued' },
            { name: 'Cleanup', status: 'queued' },
          ],
        };
        putToolOutput(sessionID, context.toolCallID, 'poll_render_job', input, output);
        return output;
      }

      const elapsed = Date.now() - job.startedAt;
      const simulatedDuration = 5000;

      if (elapsed >= simulatedDuration) {
        job.completedAt = Date.now();
        const output = {
          jobId: input.jobId, status: 'completed' as const, progress: 100, workflowUrl: input.workflowUrl,
          outputUrl: `https://cdn.example.com/videos/${input.jobId}.mp4`,
          currentStep: 'Complete', stepCount: 5, completedSteps: 5,
          steps: [
            { name: 'Download', status: 'completed', conclusion: 'success' },
            { name: 'Process', status: 'completed', conclusion: 'success' },
            { name: 'Encode', status: 'completed', conclusion: 'success' },
            { name: 'Upload', status: 'completed', conclusion: 'success' },
            { name: 'Cleanup', status: 'completed', conclusion: 'success' },
          ],
        };
        putToolOutput(sessionID, context.toolCallID, 'poll_render_job', input, output);
        return output;
      }

      const pct = Math.round((elapsed / simulatedDuration) * 100);
      const phase = pct < 20 ? 'Download' : pct < 50 ? 'Process' : pct < 80 ? 'Encode' : 'Upload';
      const completedCount = pct < 20 ? 1 : pct < 50 ? 2 : pct < 80 ? 3 : 4;
      const output = {
        jobId: input.jobId, status: 'processing' as const, progress: pct, workflowUrl: input.workflowUrl,
        currentStep: phase, stepCount: 5, completedSteps: completedCount,
        steps: [
          { name: 'Download', status: 'completed', conclusion: 'success' },
          { name: 'Process', status: pct >= 20 ? ('completed' as const) : ('in_progress' as const), conclusion: pct >= 20 ? 'success' : undefined },
          { name: 'Encode', status: pct >= 50 ? ('completed' as const) : ('pending' as const), conclusion: pct >= 50 ? 'success' : undefined },
          { name: 'Upload', status: pct >= 80 ? ('completed' as const) : ('pending' as const), conclusion: pct >= 80 ? 'success' : undefined },
          { name: 'Cleanup', status: 'pending' },
        ],
      };
      putToolOutput(sessionID, context.toolCallID, 'poll_render_job', input, output);
      return output;
    }),
});
