import type { GitHubConnectorService } from '../github.js';

export async function listRepos(this: GitHubConnectorService, owner?: string) {
  const endpoint = owner ? `/users/${owner}/repos` : '/user/repos';
  return this.apiFetch(`${endpoint}?sort=updated&per_page=50`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
}

export async function listIssues(this: GitHubConnectorService, owner: string, repo: string) {
  return this.apiFetch(`/repos/${owner}/${repo}/issues?state=open&per_page=20`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
}

export async function listPRs(this: GitHubConnectorService, owner: string, repo: string) {
  return this.apiFetch(`/repos/${owner}/${repo}/pulls?state=open&per_page=20`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
}

export async function searchCode(this: GitHubConnectorService, query: string) {
  return this.apiFetch(`/search/code?q=${encodeURIComponent(query)}&per_page=20`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
}

export async function createRepoFromTemplate(
  this: GitHubConnectorService,
  params: {
    templateOwner: string;
    templateRepo: string;
    newRepoName: string;
    description?: string;
    private?: boolean;
  },
): Promise<{ id: number; name: string; fullName: string; htmlUrl: string }> {
  const { templateOwner, templateRepo, newRepoName, description, private: isPrivate } = params;
  const data = {
    owner: templateOwner,
    repo: templateRepo,
    name: newRepoName,
    description: description || '',
    private: isPrivate ?? true,
  };

  const result = await this.apiFetch(
    `/repos/${templateOwner}/${templateRepo}/generate`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
  );

  return {
    id: result.id,
    name: result.name,
    fullName: result.full_name,
    htmlUrl: result.html_url,
  };
}

export async function dispatchWorkflow(
  this: GitHubConnectorService,
  params: {
    owner: string;
    repo: string;
    workflowFileName: string;
    ref: string;
    inputs: Record<string, string>;
  },
): Promise<void> {
  const { owner, repo, workflowFileName, ref, inputs } = params;
  await this.apiFetch(
    `/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/dispatches`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, inputs }),
    },
  );
}

export async function listWorkflowRuns(
  this: GitHubConnectorService,
  owner: string,
  repo: string,
  opts?: { perPage?: number; event?: string },
): Promise<{ id: number; status: string; conclusion: string | null; createdAt: string; htmlUrl: string }[]> {
  const event = opts?.event ?? 'workflow_dispatch';
  const perPage = opts?.perPage ?? 20;
  const result = await this.apiFetch(
    `/repos/${owner}/${repo}/actions/runs?event=${event}&per_page=${perPage}`,
    { headers: { Accept: 'application/vnd.github.v3+json' } },
  );
  return ((result.workflow_runs || []) as any[]).map((r: any) => ({
    id: r.id,
    status: r.status,
    conclusion: r.conclusion,
    createdAt: r.created_at,
    htmlUrl: r.html_url,
  }));
}

export async function fetchRunLogs(this: GitHubConnectorService, owner: string, repo: string, runId: number): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`,
    {
      headers: {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    },
  );
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);
  if (text.startsWith('PK')) {
    return `<ZIP archive: ${text.length} bytes — extract with JSZip to view individual step logs>`;
  }
  return text.slice(0, 100_000);
}

export async function commitFile(
  this: GitHubConnectorService,
  params: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    message: string;
    branch?: string;
  },
): Promise<{ sha: string; content: { htmlUrl: string } }> {
  const { owner, repo, path, content, message, branch } = params;
  const encoded = Buffer.from(content).toString('base64');

  let existingSha: string | undefined;
  try {
    const existing = await this.apiFetch(
      `/repos/${owner}/${repo}/contents/${path}?ref=${branch ?? 'main'}`,
      { headers: { Accept: 'application/vnd.github.v3+json' } },
    );
    existingSha = existing.sha as string;
  } catch { /* file doesn't exist yet */ }

  const body: Record<string, unknown> = {
    message,
    content: encoded,
    branch: branch ?? 'main',
  };
  if (existingSha) body.sha = existingSha;

  const result = await this.apiFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  return {
    sha: result.content?.sha as string,
    content: { htmlUrl: result.content?.html_url as string },
  };
}

export async function setupWebhook(
  this: GitHubConnectorService,
  params: {
    owner: string;
    repo: string;
    url: string;
    secret?: string;
    events?: string[];
  },
): Promise<{ id: number }> {
  const { owner, repo, url, secret, events } = params;
  const result = await this.apiFetch(
    `/repos/${owner}/${repo}/hooks`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: events ?? ['workflow_run'],
        config: {
          url,
          content_type: 'json',
          secret: secret ?? '',
          insecure_ssl: '0',
        },
      }),
    },
  );
  return { id: result.id as number };
}
