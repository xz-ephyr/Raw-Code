import { type FC, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { EditorState, Tab, ProjectFileEntry } from './types';
import { VirtualFileSystem } from './FileSystem';
import { CommandRegistry } from './CommandRegistry';
import { Editor } from './Editor';
import FileExplorer from './FileExplorer';
import StatusBar from './StatusBar';
import CommandPalette from './CommandPalette';

interface IDEShellProps {
  projectName?: string;
  projectFiles?: ProjectFileEntry[];
}

function createInitialState(fs: VirtualFileSystem): EditorState {
  const allFiles = fs.getAllFiles().filter(f => !f.isFolder);
  if (allFiles.length > 0) {
    const first = allFiles[0];
    const tab: Tab = {
      id: first.path,
      path: first.path,
      name: first.name,
      language: first.language,
      content: first.content,
      savedContent: first.content,
      isDirty: false,
    };
    return { tabs: [tab], activeTabId: tab.id, cursorPosition: { line: 1, column: 1 } };
  }
  return { tabs: [], activeTabId: null, cursorPosition: { line: 1, column: 1 } };
}

const IDEShell: FC<IDEShellProps> = ({ projectName, projectFiles }) => {
  const [fs] = useState(() => new VirtualFileSystem());
  const [root, setRoot] = useState(() => fs.getRoot());
  const [registry] = useState(() => new CommandRegistry());
  const [editorState, setEditorState] = useState<EditorState>(() => createInitialState(fs));
  const projectLoaded = useRef(false);

  useEffect(() => {
    if (projectName && projectFiles && projectFiles.length > 0 && !projectLoaded.current) {
      projectLoaded.current = true;
      fs.loadFromProject(projectName, projectFiles);
      setRoot(fs.getRoot());
      setEditorState(createInitialState(fs));
    }
  }, [projectName, projectFiles, fs]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const refreshRoot = useCallback(() => {
    setRoot(fs.getRoot());
  }, [fs]);

  const handleSave = useCallback(() => {
    setEditorState(prev => {
      if (!prev.activeTabId) return prev;
      const tab = prev.tabs.find(t => t.id === prev.activeTabId);
      if (!tab) return prev;
      fs.saveFile(tab.path, tab.content);
      return {
        ...prev,
        tabs: prev.tabs.map(t =>
          t.id === tab.id ? { ...t, savedContent: t.content, isDirty: false } : t
        ),
      };
    });
  }, [fs]);

  const handleCloseTab = useCallback(() => {
    setEditorState(prev => {
      if (!prev.activeTabId) return prev;
      const newTabs = prev.tabs.filter(t => t.id !== prev.activeTabId);
      const newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      return { ...prev, tabs: newTabs, activeTabId: newActiveId };
    });
  }, []);

  const handleFileOpen = useCallback((path: string) => {
    const node = fs.getNode(path);
    if (!node || node.isFolder) return;
    setEditorState(prev => {
      const existing = prev.tabs.find(t => t.path === path);
      if (existing) {
        return { ...prev, activeTabId: existing.id };
      }
      const newTab: Tab = {
        id: path,
        path: node.path,
        name: node.name,
        language: node.language,
        content: node.content,
        savedContent: node.content,
        isDirty: false,
      };
      return { ...prev, tabs: [...prev.tabs, newTab], activeTabId: newTab.id };
    });
  }, [fs]);

  const handleTabSelect = useCallback((tabId: string) => {
    setEditorState(prev => ({ ...prev, activeTabId: tabId }));
  }, []);

  const handleContentChange = useCallback((tabId: string, content: string) => {
    setEditorState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === tabId ? { ...t, content, isDirty: content !== t.savedContent } : t
      ),
    }));
  }, []);

  const handleTabClose = useCallback((tabId: string) => {
    setEditorState(prev => {
      const newTabs = prev.tabs.filter(t => t.id !== tabId);
      let newActiveId = prev.activeTabId;
      if (prev.activeTabId === tabId) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }
      return { ...prev, tabs: newTabs, activeTabId: newActiveId };
    });
  }, []);

  const handleFileCreate = useCallback((path: string) => {
    try {
      if (!path) return;
      const name = fs.getFileName(path);
      if (!name) return;
      fs.createFile(path, '');
      refreshRoot();
    } catch (e) {
      console.error('Failed to create file:', e);
    }
  }, [fs, refreshRoot]);

  const handleFolderCreate = useCallback((path: string) => {
    try {
      if (!path) return;
      const name = fs.getFileName(path);
      if (!name) return;
      fs.createFolder(path);
      refreshRoot();
    } catch (e) {
      console.error('Failed to create folder:', e);
    }
  }, [fs, refreshRoot]);

  const handleDelete = useCallback((path: string) => {
    try {
      fs.delete(path);
      setEditorState(prev => ({
        ...prev,
        tabs: prev.tabs.filter(t => t.path !== path),
        activeTabId: prev.activeTabId === path
          ? (prev.tabs.filter(t => t.path !== path).length > 0
            ? prev.tabs.filter(t => t.path !== path)[prev.tabs.filter(t => t.path !== path).length - 1].id
            : null)
          : prev.activeTabId,
      }));
      refreshRoot();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  }, [fs, refreshRoot]);

  const handleRename = useCallback((oldPath: string, newName: string) => {
    try {
      fs.rename(oldPath, newName);
      const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = parentDir ? `${parentDir}/${newName}` : `/${newName}`;
      setEditorState(prev => ({
        ...prev,
        tabs: prev.tabs.map(t =>
          t.path === oldPath
            ? { ...t, id: newPath, path: newPath, name: newName }
            : t
        ),
        activeTabId: prev.activeTabId === oldPath ? newPath : prev.activeTabId,
      }));
      refreshRoot();
    } catch (e) {
      console.error('Failed to rename:', e);
    }
  }, [fs, refreshRoot]);

  const openFiles = useMemo(() => editorState.tabs.map(t => t.path), [editorState.tabs]);

  const handleCommandSelect = useCallback((commandId: string) => {
    registry.execute(commandId);
  }, [registry]);

  const commands = useMemo(() => [
    { id: 'save', label: 'Save File', shortcut: 'Ctrl+S', execute: () => handleSave() },
    { id: 'close-tab', label: 'Close Tab', shortcut: 'Ctrl+W', execute: () => handleCloseTab() },
    { id: 'command-palette', label: 'Command Palette', shortcut: 'Ctrl+P', execute: () => setCommandPaletteOpen(true) },
  ], [handleSave, handleCloseTab]);

  useEffect(() => {
    commands.forEach(cmd => registry.register(cmd));
  }, [commands, registry]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          setCommandPaletteOpen(prev => !prev);
          break;
        case 's':
          e.preventDefault();
          handleSave();
          break;
        case 'w':
          e.preventDefault();
          handleCloseTab();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleCloseTab]);

  const activeTab = editorState.tabs.find(t => t.id === editorState.activeTabId);

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-[10px] overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <div className="w-[240px] shrink-0 border-r border-border">
          <FileExplorer
            root={root}
            onFileOpen={handleFileOpen}
            onFileCreate={handleFileCreate}
            onFolderCreate={handleFolderCreate}
            onDelete={handleDelete}
            onRename={handleRename}
            openFiles={openFiles}
          />
        </div>
        <Editor
          tabs={editorState.tabs}
          activeTabId={editorState.activeTabId}
          onTabSelect={handleTabSelect}
          onTabClose={handleTabClose}
          onContentChange={handleContentChange}
        />
      </div>
      <StatusBar
        language={activeTab?.language}
        cursorLine={editorState.cursorPosition.line}
        cursorColumn={editorState.cursorPosition.column}
        tabCount={editorState.tabs.length}
      />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={registry.getAll()}
        onCommandSelect={handleCommandSelect}
        files={fs.getAllFiles()}
        onFileSelect={handleFileOpen}
      />
    </div>
  );
};

export default IDEShell;
