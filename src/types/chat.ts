export interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  archived: boolean;
  createdAt: number;
  updatedAt?: number;
}
