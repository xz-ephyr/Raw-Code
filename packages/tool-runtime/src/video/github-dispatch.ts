import { Effect } from 'effect';

const GITHUB_API = 'https://api.github.com';

export function dispatchWorkflow(input: {
  repoOwner: string;
  repoName: string;
  workflowFileName: string;
  branch: string;
  accessToken: string;
  sourceFileId: string;
  manifestJson: string;
  callbackUrl?: string;
}): Effect.Effect<{ id: number; url: string }, Error> {
  return Effect.gen(function* () {
    const url = `${GITHUB_API}/repos/${input.repoOwner}/${input.repoName}/actions/workflows/${input.workflowFileName}/dispatches`;

    const body: Record<string, unknown> = {
      ref: input.branch,
      inputs: {
        sourceFileId: input.sourceFileId,
        accessToken: input.accessToken,
        manifest: input.manifestJson,
      },
    };

    if (input.callbackUrl) {
      (body.inputs as Record<string, string>).callbackUrl = input.callbackUrl;
    }

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'raw-code-video-tool',
          },
          body: JSON.stringify(body),
        }),
      catch: (e) =>
        new Error(`GitHub API request failed: ${e instanceof Error ? e.message : String(e)}`),
    });

    if (response.status === 204) {
      const runUrl = `https://github.com/${input.repoOwner}/${input.repoName}/actions/workflows/${input.workflowFileName}`;
      return { id: 0, url: runUrl };
    }

    if (response.status === 422) {
      const errorBody = yield* Effect.tryPromise({
        try: () => response.text(),
        catch: () => new Error('Failed to read 422 error body'),
      });
      return yield* Effect.fail(
        new Error(`GitHub API validation error (422): ${errorBody || 'No error body returned'}`),
      );
    }

    const errorBody = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: () => new Error('Failed to read error response body'),
    });
    const errorMessage = errorBody || '';
    return yield* Effect.fail(
      new Error(`GitHub API error (${response.status}): ${errorMessage || response.statusText}`),
    );
  });
}

export function fetchRunLogs(
  owner: string,
  repo: string,
  runId: number,
  token: string,
): Effect.Effect<string, Error> {
  return Effect.tryPromise({
    try: async () => {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'raw-code-video-tool',
          },
        },
      );
      if (!res.ok) throw new Error(`GH logs API error: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const text = new TextDecoder().decode(arrayBuffer);
      if (text.startsWith('PK')) {
        return '<ZIP archive — extract with JSZip for per-step logs>';
      }
      return text.slice(0, 200_000);
    },
    catch: (e) => new Error(`Failed to fetch run logs: ${e instanceof Error ? e.message : String(e)}`),
  });
}

export function pollRunStatus(
  owner: string,
  repo: string,
  runId: number,
  token: string,
): Effect.Effect<{ status: string; conclusion: string | null }, Error> {
  return Effect.tryPromise({
    try: async () => {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'raw-code-video-tool',
          },
        },
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const data = await res.json();
      return { status: data.status as string, conclusion: data.conclusion as string | null };
    },
    catch: (e) => new Error(`Failed to poll GH run: ${e instanceof Error ? e.message : String(e)}`),
  });
}
