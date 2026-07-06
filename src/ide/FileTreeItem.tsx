import { useState, useEffect, useRef } from 'react';
import {
  File01Icon,
  Add01Icon,
  Edit02Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import { cn } from '@/lib/utils';
import type { FileNode } from './types';

const FolderIcon = () => (
  <img src="/wiki-folder.png" alt="" className="w-5 h-[14px] shrink-0" />
);

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  onFileOpen: (path: string) => void;
  onFileCreate: (path: string) => void;
  onFolderCreate: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  isOpen: boolean;
}

const FileTreeItem = ({
  node,
  depth,
  onFileOpen,
  onFileCreate,
  onFolderCreate,
  onDelete,
  onRename,
  isOpen,
}: FileTreeItemProps) => {
  const [expanded, setExpanded] = useState(node.expanded);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    const handleClick = () => setMenuPos(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const closeMenu = () => setMenuPos(null);

  const handleClick = () => {
    if (node.isFolder) {
      setExpanded(!expanded);
    } else {
      onFileOpen(node.path);
    }
  };

  const handleRenameSubmit = () => {
    if (editName.trim() && editName.trim() !== node.name) {
      onRename(node.path, editName.trim());
    }
    setEditing(false);
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-[6px] text-xs cursor-pointer active:scale-[0.99]',
          isOpen ? 'bg-muted' : 'hover:bg-muted'
        )}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuPos({ top: e.clientY, left: e.clientX });
        }}
      >
        {node.isFolder ? (
          <FolderIcon />
        ) : (
          <HugeiconRenderer icon={File01Icon} size={14} />
        )}
        {editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex"
          >
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => { setEditName(node.name); setEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditName(node.name);
                  setEditing(false);
                }
              }}
              className="w-full bg-card border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>
        ) : (
          <span className="truncate flex-1">{node.name}</span>
        )}
      </div>

      {menuPos && (
        <div
          className="fixed w-32 bg-card border border-border rounded-xl shadow-lg py-1 z-[9999]"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {node.isFolder && (
            <>
              <button
                type="button"
                onClick={() => { onFileCreate(node.path); closeMenu(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <HugeiconRenderer icon={Add01Icon} size={13} />
                New File
              </button>
              <button
                type="button"
                onClick={() => { onFolderCreate(node.path); closeMenu(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <HugeiconRenderer icon={Add01Icon} size={13} />
                New Folder
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => { setEditName(node.name); setEditing(true); closeMenu(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <HugeiconRenderer icon={Edit02Icon} size={13} />
            Rename
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(node.path); closeMenu(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <HugeiconRenderer icon={Delete02Icon} size={13} />
            Delete
          </button>
        </div>
      )}

      {node.isFolder && expanded && node.children.map((child) => (
        <FileTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          onFileOpen={onFileOpen}
          onFileCreate={onFileCreate}
          onFolderCreate={onFolderCreate}
          onDelete={onDelete}
          onRename={onRename}
          isOpen={false}
        />
      ))}
    </div>
  );
};

export default FileTreeItem;
