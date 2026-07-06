import { WikiFolder, WikiDocument } from '@/types/wiki';

const FOLDERS_KEY = 'wiki_folders';
const DOCUMENTS_KEY = 'wiki_documents';

function loadFolders(): WikiFolder[] {
  try {
    return JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]');
  } catch (e) {
    console.error('Failed to load wiki folders:', e);
    return [];
  }
}

function saveFolders(folders: WikiFolder[]): void {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error('Failed to save wiki folders:', e);
  }
}

function loadDocuments(): WikiDocument[] {
  try {
    return JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]');
  } catch (e) {
    console.error('Failed to load wiki documents:', e);
    return [];
  }
}

function saveDocuments(documents: WikiDocument[]): void {
  try {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  } catch (e) {
    console.error('Failed to save wiki documents:', e);
  }
}

export class WikiManager {
  static async getFolders(): Promise<WikiFolder[]> {
    const folders = loadFolders();
    return folders.sort((a, b) => a.name.localeCompare(b.name));
  }

  static async createFolder(name: string): Promise<WikiFolder> {
    const folders = loadFolders();
    const folder: WikiFolder = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
    };
    folders.push(folder);
    saveFolders(folders);
    return folder;
  }

  static async renameFolder(id: string, name: string): Promise<WikiFolder | null> {
    const folders = loadFolders();
    const index = folders.findIndex((f) => f.id === id);
    if (index === -1) return null;
    folders[index] = { ...folders[index], name };
    saveFolders(folders);
    return folders[index];
  }

  static async deleteFolder(id: string): Promise<void> {
    const folders = loadFolders();
    const filtered = folders.filter((f) => f.id !== id);
    if (filtered.length !== folders.length) {
      saveFolders(filtered);
    }
  }

  static async getDocuments(folderId?: string | null): Promise<WikiDocument[]> {
    const documents = loadDocuments();
    let filtered = documents;
    if (folderId !== undefined) {
      filtered = documents.filter((d) => d.folderId === folderId);
    }
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async getAllDocuments(): Promise<WikiDocument[]> {
    const documents = loadDocuments();
    return documents.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async getDocument(id: string): Promise<WikiDocument | null> {
    const documents = loadDocuments();
    return documents.find((d) => d.id === id) || null;
  }

  static async searchDocuments(query: string): Promise<WikiDocument[]> {
    const documents = loadDocuments();
    const lower = query.toLowerCase();
    return documents
      .filter((d) => d.title.toLowerCase().includes(lower) || d.content.toLowerCase().includes(lower))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async createDocument(data: { title: string; content: string; folderId?: string | null }): Promise<WikiDocument> {
    const documents = loadDocuments();
    const now = Date.now();
    const document: WikiDocument = {
      id: crypto.randomUUID(),
      folderId: data.folderId ?? null,
      title: data.title,
      content: data.content,
      createdAt: now,
      updatedAt: now,
    };
    documents.push(document);
    saveDocuments(documents);
    return document;
  }

  static async updateDocument(id: string, data: Partial<Pick<WikiDocument, 'title' | 'content' | 'folderId'>>): Promise<WikiDocument | null> {
    const documents = loadDocuments();
    const index = documents.findIndex((d) => d.id === id);
    if (index === -1) return null;
    documents[index] = {
      ...documents[index],
      ...data,
      updatedAt: Date.now(),
    };
    saveDocuments(documents);
    return documents[index];
  }

  static async deleteDocument(id: string): Promise<void> {
    const documents = loadDocuments();
    const filtered = documents.filter((d) => d.id !== id);
    if (filtered.length !== documents.length) {
      saveDocuments(filtered);
    }
  }
}
