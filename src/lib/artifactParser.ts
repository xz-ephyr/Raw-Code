import type { Artifact, ArtifactType } from '../types/artifact';
import { MIME_TO_ARTIFACT_TYPE } from '../types/artifact';

const antArtifactRegex = /<(?:antArtifact|write_artifact)\s+([^>]*)>([\s\S]*?)<\/(?:antArtifact|write_artifact)>/gi;

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? '';
  }
  return attrs;
}

function resolveType(typeAttr: string): ArtifactType {
  const trimmed = typeAttr.trim();
  if (trimmed in MIME_TO_ARTIFACT_TYPE) {
    return MIME_TO_ARTIFACT_TYPE[trimmed];
  }
  if (trimmed === 'application/vnd.ant.code') return 'code';
  if (trimmed === 'text/html') return 'html';
  if (trimmed === 'application/vnd.ant.react') return 'react';
  if (trimmed === 'image/svg+xml') return 'svg';
  if (trimmed === 'application/vnd.ant.mermaid') return 'mermaid';
  if (trimmed === 'text/markdown') return 'markdown';
  return 'code';
}

export interface ParseResult {
  artifacts: Artifact[];
  cleanText: string;
}

export function parseArtifacts(text: string): ParseResult {
  const artifacts: Artifact[] = [];
  const replacements: { index: number; length: number }[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(antArtifactRegex.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const attrString = match[1];
    const content = match[2].trim();
    const attrs = parseAttributes(attrString);

    const mimeType = attrs['type'] || '';
    const artifactType = resolveType(mimeType);

    const artifact: Artifact = {
      identifier: attrs['identifier'] || `artifact-${artifacts.length}`,
      type: artifactType,
      title: attrs['title'] || artifactType.charAt(0).toUpperCase() + artifactType.slice(1),
      language: attrs['language'],
      content,
      version: 0,
      createdAt: Date.now(),
    };

    artifacts.push(artifact);
    replacements.push({ index: match.index, length: fullMatch.length });
  }

  let cleanText = text;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { index, length } = replacements[i];
    cleanText = cleanText.slice(0, index) + cleanText.slice(index + length);
  }

  cleanText = cleanText.trim();

  return { artifacts, cleanText };
}

export function stripArtifactTags(text: string): string {
  return text.replace(antArtifactRegex, '').trim();
}

export function canPreviewType(type: ArtifactType): boolean {
  return type === 'html' || type === 'react' || type === 'svg' || type === 'mermaid' || type === 'markdown';
}
