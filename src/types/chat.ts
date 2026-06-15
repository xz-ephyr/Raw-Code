export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  projectId?: string;
  archived: boolean;
  createdAt: number;
}
