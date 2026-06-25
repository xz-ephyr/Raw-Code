export type ArtifactType = 'code' | 'html' | 'react' | 'svg' | 'mermaid' | 'markdown';

export interface Artifact {
  identifier: string;
  type: ArtifactType;
  title: string;
  language?: string;
  content: string;
  version: number;
  createdAt: number;
  versions?: ArtifactVersion[];
}

export interface ArtifactVersion {
  content: string;
  version: number;
  createdAt: number;
}

export const ARTIFACT_MIME_TYPES: Record<ArtifactType, string> = {
  code: 'application/vnd.ant.code',
  html: 'text/html',
  react: 'application/vnd.ant.react',
  svg: 'image/svg+xml',
  mermaid: 'application/vnd.ant.mermaid',
  markdown: 'text/markdown',
};

export const MIME_TO_ARTIFACT_TYPE: Record<string, ArtifactType> = {
  'application/vnd.ant.code': 'code',
  'text/html': 'html',
  'application/vnd.ant.react': 'react',
  'image/svg+xml': 'svg',
  'application/vnd.ant.mermaid': 'mermaid',
  'text/markdown': 'markdown',
};

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  code: 'Code',
  html: 'HTML',
  react: 'React',
  svg: 'SVG',
  mermaid: 'Mermaid',
  markdown: 'Document',
};
