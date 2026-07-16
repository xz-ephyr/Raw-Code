export interface ContentVersion {
  readonly artifactId: string;
  readonly artifactType: 'article' | 'script' | 'text';
  readonly version: number;
  readonly content: string;
  readonly title: string;
  readonly previousContent: string | null;
  readonly timestamp: number;
  readonly author: string;
}

const MAX_VERSIONS_PER_ARTIFACT = 10;
const versions = new Map<string, ContentVersion[]>();

function makeKey(artifactId: string, artifactType: string): string {
  return `${artifactType}:${artifactId}`;
}

export function putVersion(entry: ContentVersion): void {
  const key = makeKey(entry.artifactId, entry.artifactType);
  const list = versions.get(key) ?? [];
  list.push(entry);
  if (list.length > MAX_VERSIONS_PER_ARTIFACT) {
    list.splice(0, list.length - MAX_VERSIONS_PER_ARTIFACT);
  }
  versions.set(key, list);
}

export function getVersions(artifactId: string, artifactType: string): readonly ContentVersion[] {
  return versions.get(makeKey(artifactId, artifactType)) ?? [];
}

export function getLatestVersion(artifactId: string, artifactType: string): ContentVersion | undefined {
  const list = versions.get(makeKey(artifactId, artifactType));
  return list?.[list.length - 1];
}

export function getAllArtifactIds(): string[] {
  return [...new Set([...versions.keys()].map(k => k.split(':')[1]))];
}
