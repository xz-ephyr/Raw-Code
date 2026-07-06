import { useState, Fragment } from 'react';
import {
  File01Icon,
  Add01Icon,
  Edit02Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { WikiFolder, WikiDocument } from '@/types/wiki';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { cn } from '@/lib/utils';
import { useToast } from '../ui/Toast';

const WikiFolderIcon = () => (
  <img src="/wiki-folder.png" alt="" className="w-6 h-[18px] shrink-0" />
);

interface WikiFolderTreeProps {
  folders: WikiFolder[];
  documents: WikiDocument[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onSelectDocument: (doc: WikiDocument) => void;
  onCreateFolder: () => void;
  onCreateDocument: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteDocument: (id: string) => void;
}

const WikiFolderTree = ({
  folders,
  documents,
  selectedFolderId,
  onSelectFolder,
  onSelectDocument,
  onCreateFolder,
  onCreateDocument,
  onRenameFolder,
  onDeleteFolder,
  onDeleteDocument,
}: WikiFolderTreeProps) => {
  const { confirmAsync } = useToast();
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleDeleteFolder = async (folderId: string) => {
    const confirmed = await confirmAsync('Are you sure you want to delete this folder?');
    if (confirmed) onDeleteFolder(folderId);
  };

  const handleRenameSubmit = (folderId: string) => {
    if (editName.trim()) onRenameFolder(folderId, editName.trim());
    setEditingFolderId(null);
  };

  const getFolderDocuments = (folderId: string) =>
    documents.filter((d) => d.folderId === folderId);

  const uncategorizedDocs = documents.filter((d) => d.folderId === null);

  return (
    <div className="w-[260px] shrink-0 h-full bg-card border-r border-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <h2 className="text-sm font-bold text-foreground">Wiki</h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onCreateDocument}
            className="p-1 hover:bg-muted rounded-[8px] cursor-pointer active:scale-[0.99]"
            aria-label="New document"
            title="New document"
          >
            <HugeiconRenderer icon={File01Icon} size={16} />
          </button>
          <button
            type="button"
            onClick={onCreateFolder}
            className="p-1 hover:bg-muted rounded-[8px] cursor-pointer active:scale-[0.99]"
            aria-label="Add folder"
            title="Add folder"
          >
            <HugeiconRenderer icon={Add01Icon} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar px-2 pb-3 space-y-0.5">
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-sm cursor-pointer active:scale-[0.99] transition-colors',
            selectedFolderId === null ? 'bg-muted' : 'hover:bg-muted text-foreground'
          )}
        >
          <WikiFolderIcon />
          <span className="truncate flex-1 text-left">All Documents</span>
          <span className="text-[10px] text-muted-foreground font-medium tabular-nums">{documents.length}</span>
        </button>

        {folders.map((folder) => {
          const folderDocs = getFolderDocuments(folder.id);
          return (
            <Fragment key={folder.id}>
              <div className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelectFolder(folder.id)}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-sm cursor-pointer active:scale-[0.99] transition-colors min-w-0',
                    selectedFolderId === folder.id ? 'bg-muted' : 'hover:bg-muted text-foreground'
                  )}
                >
                  <WikiFolderIcon />
                  {editingFolderId === folder.id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(folder.id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex"
                    >
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => setEditingFolderId(null)}
                        className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                      />
                    </form>
                  ) : (
                    <>
                      <span className="truncate flex-1 text-left">{folder.name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium tabular-nums">{folderDocs.length}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditName(folder.name);
                    setEditingFolderId(editingFolderId === folder.id ? null : folder.id);
                  }}
                  className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-[6px] cursor-pointer active:scale-[0.99] transition-all"
                  aria-label="Rename folder"
                >
                  <HugeiconRenderer icon={Edit02Icon} size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                  className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive rounded-[6px] cursor-pointer active:scale-[0.99] transition-all"
                  aria-label="Delete folder"
                >
                  <HugeiconRenderer icon={Delete02Icon} size={14} />
                </button>
              </div>

              {folderDocs.map((doc) => (
                <div key={doc.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectDocument(doc)}
                    className="flex-1 flex items-center gap-2 pl-8 pr-2 py-1.5 rounded-[8px] text-sm cursor-pointer active:scale-[0.99] transition-colors hover:bg-muted text-foreground min-w-0"
                  >
                    <HugeiconRenderer icon={File01Icon} size={14} />
                    <span className="truncate flex-1 text-left">{doc.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDocument(doc.id);
                    }}
                    className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive rounded-[6px] cursor-pointer active:scale-[0.99] transition-all"
                    aria-label="Delete document"
                  >
                    <HugeiconRenderer icon={Delete02Icon} size={12} />
                  </button>
                </div>
              ))}
            </Fragment>
          );
        })}

        {uncategorizedDocs.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-2 py-1.5 mt-3 text-xs font-medium text-muted-foreground border-t border-border pt-3">
              <HugeiconRenderer icon={File01Icon} size={14} />
              <span>Uncategorized</span>
              <span className="text-[10px] tabular-nums">{uncategorizedDocs.length}</span>
            </div>
            {uncategorizedDocs.map((doc) => (
              <div key={doc.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelectDocument(doc)}
                  className="flex-1 flex items-center gap-2 pl-8 pr-2 py-1.5 rounded-[8px] text-sm cursor-pointer active:scale-[0.99] transition-colors hover:bg-muted text-foreground min-w-0"
                >
                  <HugeiconRenderer icon={File01Icon} size={14} />
                  <span className="truncate flex-1 text-left">{doc.title}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument(doc.id);
                  }}
                  className="shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive rounded-[6px] cursor-pointer active:scale-[0.99] transition-all"
                  aria-label="Delete document"
                >
                  <HugeiconRenderer icon={Delete02Icon} size={12} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default WikiFolderTree;
