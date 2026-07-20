import { GoogleConnectorService } from './google-base.js';
import type { ActionDefinition } from './types.js';

export class GoogleDriveConnectorService extends GoogleConnectorService {
  readonly provider = 'google-drive';
  readonly baseUrl = 'https://www.googleapis.com/drive/v3';
  readonly envPrefix = 'GOOGLE_DRIVE_';

  protected get googleScopes(): string[] {
    return ['https://www.googleapis.com/auth/drive.file'];
  }

  protected get profileUrl(): string {
    return 'https://www.googleapis.com/drive/v3/about?fields=user';
  }

  protected extractIdentity(profile: any): string {
    return profile.user?.emailAddress || profile.user?.displayName || '';
  }

  async uploadFile(name: string, mimeType: string, body: Buffer | Blob) {
    const metadata = JSON.stringify({ name, parents: ['appDataFolder'] });
    const form = new FormData();
    form.append('metadata', new Blob([metadata], { type: 'application/json' }));
    form.append('media', new Blob([body as BlobPart], { type: mimeType }));

    const result = await this.apiFetch('/files?uploadType=multipart', {
      method: 'POST',
      body: form,
      headers: {},
    });

    return { id: result.id, name: result.name, size: result.size, webViewLink: result.webViewLink };
  }

  async downloadUrl(fileId: string): Promise<string> {
    return `${this.baseUrl}/files/${fileId}?alt=media`;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.apiFetch(`/files/${fileId}`, { method: 'DELETE' });
  }

  async listFiles(pageSize = 20): Promise<{ id: string; name: string; size: string; createdTime: string }[]> {
    const result = await this.apiFetch(
      `/files?pageSize=${pageSize}&q='appDataFolder'+in+parents&fields=files(id,name,size,createdTime)`,
    );
    return (result.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      createdTime: f.createdTime,
    }));
  }

  async deleteOlderThan(cutoffMs: number): Promise<number> {
    const files = await this.listFiles(100);
    const cutoff = new Date(cutoffMs).toISOString();
    let deleted = 0;
    for (const f of files) {
      if (new Date(f.createdTime).getTime() < cutoffMs) {
        try { await this.deleteFile(f.id); deleted++; } catch { /* skip */ }
      }
    }
    return deleted;
  }

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      ...super.getActionHandlers(),
      upload: (params: any) => this.uploadFile(params.name, params.mimeType, params.body),
      downloadUrl: (params: any) => this.downloadUrl(params.fileId),
      deleteFile: (params: any) => this.deleteFile(params.fileId),
      listFiles: (params: any) => this.listFiles(params.pageSize),
      deleteOlderThan: (params: any) => this.deleteOlderThan(params.cutoffMs),
    };
  }

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'upload',
        description: 'Upload a file to Google Drive appDataFolder',
        inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'File name' }, mimeType: { type: 'string', description: 'MIME type' }, body: { type: 'string', description: 'File content as base64' } }, required: ['name', 'mimeType', 'body'] },
        outputSchema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, size: { type: 'string' }, webViewLink: { type: 'string' } } },
      },
      {
        name: 'downloadUrl',
        description: 'Get a download URL for a Google Drive file',
        inputSchema: { type: 'object', properties: { fileId: { type: 'string', description: 'Drive file ID' } }, required: ['fileId'] },
        outputSchema: { type: 'string' },
      },
      {
        name: 'deleteFile',
        description: 'Delete a file from Google Drive',
        inputSchema: { type: 'object', properties: { fileId: { type: 'string', description: 'Drive file ID' } }, required: ['fileId'] },
        outputSchema: { type: 'object' },
      },
      {
        name: 'listFiles',
        description: 'List files in Google Drive appDataFolder',
        inputSchema: { type: 'object', properties: { pageSize: { type: 'number', description: 'Results per page (default: 20)' } } },
        outputSchema: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, size: { type: 'string' }, createdTime: { type: 'string' } } } },
      },
      {
        name: 'deleteOlderThan',
        description: 'Delete Drive files older than a timestamp',
        inputSchema: { type: 'object', properties: { cutoffMs: { type: 'number', description: 'Timestamp in ms' } }, required: ['cutoffMs'] },
        outputSchema: { type: 'number' },
      },
    ];
  }
}
