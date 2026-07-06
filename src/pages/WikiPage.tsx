import { useState, useEffect, useCallback, useRef } from 'react';
import { Search01Icon, File01Icon } from '@hugeicons/core-free-icons';
import { WikiFolder, WikiDocument } from '@/types/wiki';
import { WikiManager } from '@/services/WikiManager';
import WikiFolderTree from '../components/wiki/WikiFolderTree';
import { WikiDocumentViewer } from '../components/wiki/WikiDocumentViewer';
import { WikiEditor } from '../components/wiki/WikiEditor';
import { WikiEmptyState } from '../components/wiki/WikiEmptyState';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import { useToast } from '@/components/ui/Toast';

export const WikiPage = () => {
  const [folders, setFolders] = useState<WikiFolder[]>([]);
  const [documents, setDocuments] = useState<WikiDocument[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<WikiDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<WikiDocument | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderPrompt, setFolderPrompt] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { confirmAsync } = useToast();

  const refresh = useCallback(async () => {
    const [f, d] = await Promise.all([
      WikiManager.getFolders(),
      selectedFolderId ? WikiManager.getDocuments(selectedFolderId) : WikiManager.getAllDocuments(),
    ]);
    setFolders(f);
    setDocuments(d);
  }, [selectedFolderId]);

  useEffect(() => {
    WikiManager.getFolders().then(setFolders);
    WikiManager.getAllDocuments().then(setDocuments);
  }, []);

  useEffect(() => {
    if (folderPrompt !== null && folderInputRef.current) {
      folderInputRef.current.focus();
    }
  }, [folderPrompt]);

  const handleSelectFolder = useCallback((id: string | null) => {
    setSelectedFolderId(id);
    setSelectedDoc(null);
    setEditingDoc(null);
    setIsCreating(false);
  }, []);

  const handleCreateDoc = useCallback(() => {
    setIsCreating(true);
    setSelectedDoc(null);
    setEditingDoc(null);
  }, []);

  const handleSelectDocument = useCallback((doc: WikiDocument) => {
    setSelectedDoc(doc);
    setEditingDoc(null);
    setIsCreating(false);
  }, []);

  const handleEditDocument = useCallback((doc: WikiDocument) => {
    setEditingDoc(doc);
    setIsCreating(false);
  }, []);

  const handleSaveDocument = useCallback(async (data: { title: string; content: string; folderId?: string | null }) => {
    if (editingDoc) {
      await WikiManager.updateDocument(editingDoc.id, data);
    } else {
      await WikiManager.createDocument({ ...data, folderId: data.folderId ?? selectedFolderId });
    }
    setEditingDoc(null);
    setIsCreating(false);
    await refresh();
  }, [editingDoc, selectedFolderId, refresh]);

  const handleDeleteDocument = useCallback(async (id: string) => {
    const confirmed = await confirmAsync('Delete this document?');
    if (!confirmed) return;
    await WikiManager.deleteDocument(id);
    if (selectedDoc?.id === id) setSelectedDoc(null);
    await refresh();
  }, [selectedDoc, refresh, confirmAsync]);

  const handleCreateFolder = useCallback(() => {
    setFolderPrompt('');
  }, []);

  const handleFolderPromptSubmit = useCallback(async () => {
    const name = folderPrompt?.trim();
    if (!name) return;
    setFolderPrompt(null);
    await WikiManager.createFolder(name);
    await refresh();
  }, [folderPrompt, refresh]);

  const handleRenameFolder = useCallback(async (id: string, name: string) => {
    await WikiManager.renameFolder(id, name);
    await refresh();
  }, [refresh]);

  const handleDeleteFolder = useCallback(async (id: string) => {
    const confirmed = await confirmAsync('Delete this folder?');
    if (!confirmed) return;
    await WikiManager.deleteFolder(id);
    if (selectedFolderId === id) setSelectedFolderId(null);
    await refresh();
  }, [selectedFolderId, refresh, confirmAsync]);

  const handleCancel = useCallback(() => {
    setEditingDoc(null);
    setIsCreating(false);
  }, []);

  const filteredDocs = searchQuery
    ? documents.filter((d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  return (
    <div className="flex-1 bg-background overflow-hidden flex relative h-full">
      <div className="flex flex-1 overflow-hidden h-full">
        <WikiFolderTree
          folders={folders}
          documents={documents}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          onSelectDocument={handleSelectDocument}
          onCreateFolder={handleCreateFolder}
          onCreateDocument={handleCreateDoc}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onDeleteDocument={handleDeleteDocument}
        />
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          <div className="shrink-0 px-6 pt-5 pb-3">
            <div className="relative max-w-md">
              <HugeiconRenderer icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted rounded-[8px] py-2 pl-9 pr-3 text-sm focus:outline-none border border-border focus:border-ring transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto thin-scrollbar">
            {searchQuery ? (
              <div className="px-6 pb-6">
                {filteredDocs.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-3">{filteredDocs.length} result{filteredDocs.length !== 1 ? 's' : ''}</p>
                    {filteredDocs.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => { setSelectedDoc(doc); setSearchQuery(''); }}
                        className="w-full text-left bg-card border border-border rounded-[10px] p-4 hover:bg-muted transition-colors cursor-pointer active:scale-[0.99]"
                      >
                        <p className="text-sm font-medium text-foreground">{doc.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.content}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-muted-foreground">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            ) : editingDoc || isCreating ? (
              <div className="p-6 max-w-3xl">
                <WikiEditor
                  key={editingDoc?.id ?? 'create'}
                  editDoc={editingDoc}
                  folders={folders}
                  currentFolderId={selectedFolderId}
                  onSave={handleSaveDocument}
                  onCancel={handleCancel}
                />
              </div>
            ) : selectedDoc ? (
              <WikiDocumentViewer
                document={selectedDoc}
                folders={folders}
                onEdit={handleEditDocument}
                onDelete={handleDeleteDocument}
              />
            ) : selectedFolderId && documents.length > 0 ? (
              <div className="px-6 pb-6">
                <p className="text-xs text-muted-foreground mb-3">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
                <div className="space-y-1">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="w-full text-left bg-card border border-border rounded-[10px] p-4 hover:bg-muted transition-colors cursor-pointer active:scale-[0.99] flex items-center gap-3"
                    >
                      <HugeiconRenderer icon={File01Icon} size={20} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Updated {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <WikiEmptyState onCreateClick={handleCreateDoc} />
            )}
          </div>
        </div>
      </div>

      {folderPrompt !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setFolderPrompt(null)}>
          <div className="bg-card border border-border rounded-[14px] shadow-xl p-6 w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">Create folder</h3>
            <input
              ref={folderInputRef}
              type="text"
              className="w-full px-3 py-2 bg-background border border-border rounded-[8px] text-sm outline-none focus:border-ring transition-all"
              placeholder="Folder name..."
              value={folderPrompt}
              onChange={(e) => setFolderPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFolderPromptSubmit();
                if (e.key === 'Escape') setFolderPrompt(null);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-1.5 text-sm rounded-[8px] bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer active:scale-[0.99] select-none"
                onClick={() => setFolderPrompt(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1.5 text-sm rounded-[8px] bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer active:scale-[0.99] select-none"
                onClick={handleFolderPromptSubmit}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
