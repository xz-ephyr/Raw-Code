export interface ChatSession {
  id: string;
  title: string;
  projectId?: string;
  archived: boolean;
  createdAt: number;
}
