export interface FileNode {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isFolder: boolean;
  children: FileNode[];
  expanded: boolean;
}

export interface Tab {
  id: string;
  path: string;
  name: string;
  language: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface EditorState {
  tabs: Tab[];
  activeTabId: string | null;
  cursorPosition: CursorPosition;
}

export interface SearchMatch {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  execute: (...args: any[]) => void;
}

export interface ProjectFileEntry {
  path: string;
  content: string;
}
