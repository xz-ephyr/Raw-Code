import { query } from '../db.js';
import { ConnectorService } from './base.js';
import type { ActionDefinition } from './types.js';
import { ensurePipelineRepo } from './github/repos.js';
import {
  listRepos,
  listIssues,
  listPRs,
  searchCode,
  createRepoFromTemplate,
  dispatchWorkflow,
  listWorkflowRuns,
  fetchRunLogs,
  commitFile,
  setupWebhook,
} from './github/api.js';

export class GitHubConnectorService extends ConnectorService {
  readonly provider = 'github';
  readonly authType = 'oauth2';
  readonly baseUrl = 'https://api.github.com';

  protected get oauthConfig() {
    return {
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      authEndpoint: 'https://github.com/login/oauth/authorize',
      revokeEndpoint: undefined,
      scopes: ['repo', 'user', 'read:org'],
    };
  }

  async getAuthUrl(options?: {
    clientId?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    state?: string;
  }): Promise<string> {
    const clientId = options?.clientId && options.clientId !== 'env'
      ? options.clientId
      : await this.resolveCredential('GITHUB_CLIENT_ID', 'github-client-id');

    const params: Record<string, string> = {
      client_id: clientId,
      redirect_uri: this.getRedirectUri(),
      scope: this.oauthConfig.scopes.join(' '),
    };

    if (options?.state) params.state = options.state;

    return `${this.oauthConfig.authEndpoint}?${new URLSearchParams(params).toString()}`;
  }

  async exchangeCode(code: string, _codeVerifier?: string | null): Promise<{ identity: string }> {
    const clientId = await this.resolveCredential('GITHUB_CLIENT_ID', 'github-client-id');
    const clientSecret = await this.resolveCredential('GITHUB_CLIENT_SECRET', 'github-client-secret');

    const res = await fetch(this.oauthConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: this.getRedirectUri(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub token exchange failed: ${err}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);

    const tempToken = data.access_token;

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tempToken}`, Accept: 'application/vnd.github.v3+json' },
    });
    let identity = '';
    if (userRes.ok) {
      const user = await userRes.json();
      identity = user.login;
    }

    const metadata: Record<string, unknown> = {};
    if (identity) {
      metadata.username = identity;
      try {
        const userData = await userRes.json();
        metadata.avatar_url = userData.avatar_url;
      } catch { /* skip */ }
    }

    await this.saveToken({
      accessToken: data.access_token,
      refreshToken: null,
      expiresAt: null,
      scope: this.oauthConfig.scopes.join(' '),
      identity,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });

    // Auto-create pipeline repo on connect
    try {
      const pipelineRepo = await this.ensurePipelineRepo();
      metadata.pipelineRepo = pipelineRepo.fullName;
    } catch (err) {
      console.warn(`Pipeline repo auto-creation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { identity };
  }

  async ensurePipelineRepo(): Promise<{ owner: string; repo: string; fullName: string }> {
    return ensurePipelineRepo.call(this);
  }

  async getStatus(): Promise<{ connected: boolean; identity: string | null }> {
    const result = await query<{ identity: string; connected: number }>(
      'SELECT identity, connected FROM oauth_tokens WHERE provider = $1',
      [this.provider]
    );
    if (result.rows.length === 0) return { connected: false, identity: null };
    return { connected: result.rows[0].connected === 1, identity: result.rows[0].identity || null };
  }

  async disconnect(): Promise<void> {
    await this.clearToken();
  }

  private getRedirectUri(): string {
    return (
      process.env.GITHUB_OAUTH_REDIRECT_URI ||
      `http://localhost:${process.env.PORT || 3001}/auth/github/callback`
    );
  }

  // --- API actions ---

  async listRepos(owner?: string) {
    return listRepos.call(this, owner);
  }

  async listIssues(owner: string, repo: string) {
    return listIssues.call(this, owner, repo);
  }

  async listPRs(owner: string, repo: string) {
    return listPRs.call(this, owner, repo);
  }

  async searchCode(query: string) {
    return searchCode.call(this, query);
  }

  async createRepoFromTemplate(params: {
    templateOwner: string;
    templateRepo: string;
    newRepoName: string;
    description?: string;
    private?: boolean;
  }): Promise<{ id: number; name: string; fullName: string; htmlUrl: string }> {
    return createRepoFromTemplate.call(this, params);
  }

  async dispatchWorkflow(params: {
    owner: string;
    repo: string;
    workflowFileName: string;
    ref: string;
    inputs: Record<string, string>;
  }): Promise<void> {
    return dispatchWorkflow.call(this, params);
  }

  async listWorkflowRuns(owner: string, repo: string, opts?: { perPage?: number; event?: string }): Promise<{ id: number; status: string; conclusion: string | null; createdAt: string; htmlUrl: string }[]> {
    return listWorkflowRuns.call(this, owner, repo, opts);
  }

  async fetchRunLogs(owner: string, repo: string, runId: number): Promise<string> {
    return fetchRunLogs.call(this, owner, repo, runId);
  }

  async commitFile(params: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    message: string;
    branch?: string;
  }): Promise<{ sha: string; content: { htmlUrl: string } }> {
    return commitFile.call(this, params);
  }

  async setupWebhook(params: {
    owner: string;
    repo: string;
    url: string;
    secret?: string;
    events?: string[];
  }): Promise<{ id: number }> {
    return setupWebhook.call(this, params);
  }

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      ...super.getActionHandlers(),
      repos: (params: any) => this.listRepos(params.owner),
      issues: (params: any) => this.listIssues(params.owner, params.repo),
      prs: (params: any) => this.listPRs(params.owner, params.repo),
      search: (params: any) => this.searchCode(params.query),
      ensurePipelineRepo: () => this.ensurePipelineRepo(),
      listWorkflowRuns: (params: any) => this.listWorkflowRuns(params.owner, params.repo, { perPage: params.perPage, event: params.event }),
      fetchRunLogs: (params: any) => this.fetchRunLogs(params.owner, params.repo, params.runId),
      commitFile: (params: any) => this.commitFile(params),
      setupWebhook: (params: any) => this.setupWebhook(params),
      createRepoFromTemplate: (params: any) => this.createRepoFromTemplate(params),
      dispatchWorkflow: (params: any) => this.dispatchWorkflow(params),
    };
  }

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'repos',
        description: 'List GitHub repositories for a user or organization',
        inputSchema: { type: 'object', properties: { owner: { type: 'string', description: 'Optional owner (defaults to authenticated user)' } } },
        outputSchema: { type: 'array' },
      },
      {
        name: 'issues',
        description: 'List issues for a GitHub repository',
        inputSchema: { type: 'object', properties: { owner: { type: 'string', description: 'Repo owner' }, repo: { type: 'string', description: 'Repo name' } }, required: ['owner', 'repo'] },
        outputSchema: { type: 'array' },
      },
      {
        name: 'prs',
        description: 'List pull requests for a GitHub repository',
        inputSchema: { type: 'object', properties: { owner: { type: 'string', description: 'Repo owner' }, repo: { type: 'string', description: 'Repo name' } }, required: ['owner', 'repo'] },
        outputSchema: { type: 'array' },
      },
      {
        name: 'search',
        description: 'Search GitHub code',
        inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'GitHub search query' } }, required: ['query'] },
        outputSchema: { type: 'object' },
      },
      {
        name: 'ensurePipelineRepo',
        description: 'Ensure the video pipeline repository exists',
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, fullName: { type: 'string' } } },
      },
      {
        name: 'listWorkflowRuns',
        description: 'List GitHub Actions workflow runs',
        inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, perPage: { type: 'number', description: 'Results per page' }, event: { type: 'string', description: 'Filter by event type' } }, required: ['owner', 'repo'] },
        outputSchema: { type: 'array', items: { type: 'object' } },
      },
      {
        name: 'fetchRunLogs',
        description: 'Fetch logs from a GitHub Actions workflow run',
        inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, runId: { type: 'number', description: 'Workflow run ID' } }, required: ['owner', 'repo', 'runId'] },
        outputSchema: { type: 'string' },
      },
      {
        name: 'commitFile',
        description: 'Commit a file to a GitHub repository',
        inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, path: { type: 'string', description: 'File path in repo' }, content: { type: 'string', description: 'File content' }, message: { type: 'string', description: 'Commit message' }, branch: { type: 'string', description: 'Branch (defaults to default)' } }, required: ['owner', 'repo', 'path', 'content', 'message'] },
        outputSchema: { type: 'object', properties: { sha: { type: 'string' }, content: { type: 'object', properties: { htmlUrl: { type: 'string' } } } } },
      },
      {
        name: 'setupWebhook',
        description: 'Set up a webhook on a GitHub repository',
        inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, url: { type: 'string', description: 'Webhook URL' }, secret: { type: 'string', description: 'Webhook secret' }, events: { type: 'array', items: { type: 'string' }, description: 'Events to trigger on (default: push)' } }, required: ['owner', 'repo', 'url'] },
        outputSchema: { type: 'object', properties: { id: { type: 'number' } } },
      },
      {
        name: 'createRepoFromTemplate',
        description: 'Create a new GitHub repository from a template',
        inputSchema: { type: 'object', properties: { templateOwner: { type: 'string' }, templateRepo: { type: 'string' }, newRepoName: { type: 'string' }, description: { type: 'string' }, private: { type: 'boolean' } }, required: ['templateOwner', 'templateRepo', 'newRepoName'] },
        outputSchema: { type: 'object', properties: { id: { type: 'number' }, name: { type: 'string' }, fullName: { type: 'string' }, htmlUrl: { type: 'string' } } },
      },
      {
        name: 'dispatchWorkflow',
        description: 'Dispatch a GitHub Actions workflow',
        inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, workflowFileName: { type: 'string', description: 'Workflow file name (e.g. deploy.yml)' }, ref: { type: 'string', description: 'Git ref (branch/tag)' }, inputs: { type: 'object', description: 'Workflow inputs' } }, required: ['owner', 'repo', 'workflowFileName', 'ref'] },
        outputSchema: { type: 'object' },
      },
    ];
  }
}
