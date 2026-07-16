import type { FileItem, FileType } from '../types/file-panel';
import { MIME_TO_FILE_TYPE } from '../types/file-panel';

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

function resolveType(typeAttr: string): FileType {
  const trimmed = typeAttr.trim();

  const SHORT_NAMES: Record<string, FileType> = {
    code: 'code',
    html: 'html',
    react: 'react',
    svg: 'svg',
    mermaid: 'mermaid',
    markdown: 'markdown',
    doc: 'doc',
    pptx: 'pptx',
    excel: 'excel',
    pdf: 'pdf',
  };

  if (trimmed in SHORT_NAMES) return SHORT_NAMES[trimmed];
  if (trimmed in MIME_TO_FILE_TYPE) return MIME_TO_FILE_TYPE[trimmed];
  return 'markdown';
}

export interface ParseResult {
  files: FileItem[];
  cleanText: string;
}

export function parseFiles(text: string): ParseResult {
  const files: FileItem[] = [];
  const replacements: { index: number; length: number }[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(antArtifactRegex.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const attrString = match[1];
    const content = match[2].trim();
    const attrs = parseAttributes(attrString);

    const mimeType = attrs['type'] || '';
    const fileType = resolveType(mimeType);

    const file: FileItem = {
      identifier: attrs['identifier'] || `file-${files.length}`,
      type: fileType,
      title: attrs['title'] || fileType.charAt(0).toUpperCase() + fileType.slice(1),
      language: attrs['language'],
      content,
      version: 0,
      createdAt: Date.now(),
    };

    files.push(file);
    replacements.push({ index: match.index, length: fullMatch.length });
  }

  let cleanText = text;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { index, length } = replacements[i];
    cleanText = cleanText.slice(0, index) + cleanText.slice(index + length);
  }

  cleanText = cleanText.trim();

  return { files, cleanText };
}

export function stripArtifactTags(text: string): string {
  return text.replace(antArtifactRegex, '').trim();
}

export function canPreviewType(type: FileType): boolean {
  return type === 'markdown' || type === 'code' || type === 'html' || type === 'react' || type === 'svg' || type === 'mermaid' || type === 'pdf';
}
