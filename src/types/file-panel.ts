export type FileType = 'code' | 'html' | 'react' | 'svg' | 'mermaid' | 'markdown' | 'doc' | 'pptx' | 'excel' | 'pdf';

export interface FileItem {
  identifier: string;
  type: FileType;
  title: string;
  language?: string;
  content: string;
  version: number;
  createdAt: number;
  versions?: FileVersion[];
}

export interface FileVersion {
  content: string;
  version: number;
  createdAt: number;
}

export const FILE_MIME_TYPES: Record<FileType, string> = {
  code: 'application/vnd.ant.code',
  html: 'text/html',
  react: 'application/vnd.ant.react',
  svg: 'image/svg+xml',
  mermaid: 'application/vnd.ant.mermaid',
  markdown: 'text/markdown',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  'application/vnd.ant.code': 'code',
  'text/html': 'html',
  'application/vnd.ant.react': 'react',
  'image/svg+xml': 'svg',
  'application/vnd.ant.mermaid': 'mermaid',
  'text/markdown': 'markdown',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/pdf': 'pdf',
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  code: 'Code',
  html: 'HTML',
  react: 'React',
  svg: 'SVG',
  mermaid: 'Mermaid',
  markdown: 'Document',
  doc: 'Word',
  pptx: 'Presentation',
  excel: 'Spreadsheet',
  pdf: 'PDF',
};
