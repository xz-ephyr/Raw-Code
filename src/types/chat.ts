export interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  archived: boolean;
  pinned?: boolean;
  unread?: boolean;
  streaming?: boolean;
  createdAt: number;
  updatedAt?: number;
}
