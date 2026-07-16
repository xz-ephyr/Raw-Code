import { PIPELINE_TEMPLATE_OWNER, PIPELINE_TEMPLATE_REPO, PIPELINE_REPO_SUFFIX } from './constants.js';
import type { GitHubConnectorService } from '../github.js';

export async function ensurePipelineRepo(this: GitHubConnectorService): Promise<{ owner: string; repo: string; fullName: string }> {
  const token = await this.getAccessToken();
  const user = await this.apiFetch('/user');
  const login = user.login as string;
  const repoName = PIPELINE_REPO_SUFFIX;

  const existing = await this.apiFetch(`/repos/${login}/${repoName}`).catch(() => null);
  if (existing) {
    const meta = await this.getTokenMetadata();
    if (meta && typeof meta === 'object') {
      meta.pipelineRepo = existing.full_name;
      await this.updateTokenMetadata(meta);
    }
    return { owner: login, repo: repoName, fullName: existing.full_name as string };
  }

  const created = await this.createRepoFromTemplate({
    templateOwner: PIPELINE_TEMPLATE_OWNER,
    templateRepo: PIPELINE_TEMPLATE_REPO,
    newRepoName: repoName,
    description: 'Raw-Code Video Pipeline — auto-created from template',
    private: true,
  });

  const meta = await this.getTokenMetadata();
  if (meta && typeof meta === 'object') {
    meta.pipelineRepo = created.fullName;
    await this.updateTokenMetadata(meta);
  }

  return { owner: login, repo: repoName, fullName: created.fullName };
}
