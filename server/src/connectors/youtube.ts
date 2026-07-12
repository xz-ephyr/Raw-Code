import { GoogleConnectorService } from './google-base.js';

export class YouTubeConnectorService extends GoogleConnectorService {
  readonly provider = 'youtube';
  readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  readonly envPrefix = 'YOUTUBE_';

  protected get googleScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];
  }

  protected get profileUrl(): string {
    return 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';
  }

  protected extractIdentity(profile: any): string {
    if (profile?.items?.[0]?.snippet) {
      return profile.items[0].snippet.title || '';
    }
    return '';
  }

  // --- API actions ---

  async searchVideos(query: string, maxResults: number = 10) {
    return this.apiFetch(
      `/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${Math.min(maxResults, 50)}&type=video`
    );
  }

  async getPlaylists(maxResults: number = 20) {
    return this.apiFetch(`/playlists?part=snippet&mine=true&maxResults=${Math.min(maxResults, 50)}`);
  }

  async getComments(videoId: string, maxResults: number = 20) {
    return this.apiFetch(
      `/commentThreads?part=snippet&videoId=${videoId}&maxResults=${Math.min(maxResults, 50)}`
    );
  }

  getActionHandlers(): Record<string, (params: any) => Promise<any>> {
    return {
      ...super.getActionHandlers(),
      search: (params: any) => this.searchVideos(params.query, params.maxResults),
      playlists: (params: any) => this.getPlaylists(params.maxResults),
      comments: (params: any) => this.getComments(params.videoId, params.maxResults),
    };
  }
}
