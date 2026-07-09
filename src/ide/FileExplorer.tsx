import { useState, useRef, useEffect } from 'react';
import { Add01Icon, File01Icon, Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import FileTreeItem from './FileTreeItem';
import type { FileNode } from './types';

const FolderIcon = () => (
  <img src="/wiki-folder.png" alt="" className="w-5 h-[14px] shrink-0" />
);

interface FileExplorerProps {
  root: FileNode;
  onFileOpen: (path: string) => void;
  onFileCreate: (path: string) => void;
  onFolderCreate: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  openFiles: string[];
}

type CreateMode = 'file' | 'folder' | null;

const FileExplorer = ({
  root,
  onFileOpen,
  onFileCreate,
  onFolderCreate,
  onDelete,
  onRename,
  openFiles,
}: FileExplorerProps) => {
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [createName, setCreateName] = useState('');
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (createMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [createMode]);

  const handleCreateSubmit = () => {
    const name = createName.trim();
    if (!name) {
      setCreateMode(null);
      setCreateName('');
      return;
    }
    const parentPath = root.path;
    if (createMode === 'file') {
      onFileCreate(`${parentPath}/${name}`);
    } else {
      onFolderCreate(`${parentPath}/${name}`);
    }
    setCreateMode(null);
    setCreateName('');
  };

  return (
    <div className="w-[260px] shrink-0 h-full bg-card border-r border-border flex flex-col rounded-[10px]">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <h2 className="text-sm font-bold">Explorer</h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCreateDropdown(p => !p)}
            className="p-1 hover:bg-muted rounded-[8px] cursor-pointer active:scale-[0.99]"
            aria-label="Create new file or folder"
          >
            <HugeiconRenderer icon={Add01Icon} />
          </button>
          {showCreateDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                <button
                  type="button"
                  onClick={() => { setShowCreateDropdown(false); setCreateMode('file'); setCreateName(''); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer"
                >
                  <HugeiconRenderer icon={File01Icon} size={14} />
                  New File...
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateDropdown(false); setCreateMode('folder'); setCreateName(''); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer"
                >
                  <HugeiconRenderer icon={Folder01Icon} size={14} />
                  New Folder...
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar px-2 pb-2">
        <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground/80 select-none">
          <FolderIcon />
          <span className="truncate">{root.name}</span>
        </div>
        {createMode && (
          <div className="flex items-center gap-1 py-1 px-2 rounded-[6px]" style={{ paddingLeft: 16 + 8 }}>
            {createMode === 'folder' ? <FolderIcon /> : <HugeiconRenderer icon={Add01Icon} size={14} />}
            <form onSubmit={(e) => { e.preventDefault(); handleCreateSubmit(); }} className="flex-1 flex">
              <input
                ref={inputRef}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onBlur={() => { setCreateMode(null); setCreateName(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setCreateMode(null);
                    setCreateName('');
                  }
                }}
                placeholder={`New ${createMode}...`}
                className="w-full bg-card border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </form>
          </div>
        )}
        {root.children.map((child) => (
          <FileTreeItem
            key={child.id}
            node={child}
            depth={0}
            onFileOpen={onFileOpen}
            onFileCreate={onFileCreate}
            onFolderCreate={onFolderCreate}
            onDelete={onDelete}
            onRename={onRename}
            isOpen={openFiles.includes(child.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
