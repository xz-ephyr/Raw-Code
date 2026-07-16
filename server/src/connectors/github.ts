import { query } from '../db.js';
import { ConnectorService } from './base.js';
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
}
