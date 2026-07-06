export interface WikiFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface WikiDocument {
  id: string;
  folderId: string | null;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
