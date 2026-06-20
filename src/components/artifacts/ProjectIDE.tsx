import React, { useState, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import {
  Folder02Icon,
  File02Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Search01Icon,
  ArrowRight01Icon,
  Tick01Icon,
  CloudSavingDone01Icon,
} from '@hugeicons/core-free-icons';
import { FileEntry, FileSystemService } from '../../services/FileSystemService';
import { Project } from '../../types/chat';
import { HugeiconRenderer } from '../common/HugeiconRenderer';
import { FileNode } from './FileNode';
import { getLanguage, getLanguageName } from '../../utils/languageUtils';

interface ProjectIDEProps {
  project: Project;
  onClose: () => void;
  onSave?: (path: string, content: string) => void;
}

export const ProjectIDE: React.FC<ProjectIDEProps> = ({ project, onClose, onSave }) => {
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<FileEntry | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [openBreadcrumb, setOpenBreadcrumb] = useState<string | null>(null);
  const [breadcrumbRect, setBreadcrumbRect] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    loadTree();
  }, [project.path]);

  const loadTree = async () => {
    const newTree = await FileSystemService.getTree(project.path);
    setTree(newTree);
  };

  const handleFileClick = async (file: FileEntry) => {
    if (file.isDirectory) return;
    const fileContent = await FileSystemService.getFileContent(file.path);
    setActiveFile(file);
    setContent(fileContent);
    setOpenBreadcrumb(null);
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      await FileSystemService.saveFile(activeFile.path, content);
      onSave?.(activeFile.path, content);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const breadcrumbs = useMemo(() => {
    if (!activeFile) return [];
    const relativePath = activeFile.path.replace(project.path, '').replace(/^[/\\]/, '');
    const parts = relativePath.split(/[/\\]/);
    return parts.map((name, index) => ({
      name,
      path: parts.slice(0, index + 1).join('/'),
      isLast: index === parts.length - 1,
    }));
  }, [activeFile, project.path]);

  const findNodeByPath = (nodes: FileEntry[], relativePath: string): FileEntry | null => {
    const targetPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
    for (const node of nodes) {
      const nodeRelativePath = node.path.replace(project.path, '').replace(/\\/g, '/');
      const normalizedNodePath = nodeRelativePath.startsWith('/')
        ? nodeRelativePath
        : '/' + nodeRelativePath;

      if (normalizedNodePath === targetPath) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, relativePath);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className="w-full h-full border-l border-neutral-200 bg-white flex flex-col z-20 font-sans">
      <div className="h-12 border-b border-neutral-200 px-4 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2 overflow-hidden mr-4">
          <div className="text-blue-600">
            <HugeiconRenderer icon={Folder02Icon} size={18} />
          </div>
          <h2 className="text-sm font-medium text-neutral-900 truncate">{project.name}</h2>
          <span className="text-neutral-300">/</span>
          <p className="text-xs text-neutral-400 truncate">{project.path}</p>
        </div>
        <div className="flex items-center gap-1">
          {activeFile && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              title="Save (Ctrl+S)"
            >
              <HugeiconRenderer icon={FloppyDiskIcon} size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500 hover:text-neutral-900"
          >
            <HugeiconRenderer icon={Cancel01Icon} size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-60 border-r border-neutral-200 overflow-y-auto bg-[#f8f9fa] py-2 shrink-0">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Explorer
            </span>
          </div>
          <div className="px-4 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                className="w-full bg-white border border-neutral-200 rounded-md py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-400"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                <HugeiconRenderer icon={Search01Icon} size={12} />
              </div>
            </div>
          </div>
          {tree.map((node) => (
            <FileNode
              key={node.path}
              node={node}
              activePath={activeFile?.path}
              onClick={handleFileClick}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {activeFile ? (
            <>
              <div className="h-9 border-b border-neutral-200 flex items-center px-3 bg-white shrink-0 relative">
                <div className="flex items-center gap-1 text-xs text-neutral-500 overflow-x-auto no-scrollbar flex-1 h-full">
                  {breadcrumbs.map((bc, i) => (
                    <React.Fragment key={bc.path}>
                      {i > 0 && (
                        <HugeiconRenderer
                          icon={ArrowRight01Icon}
                          size={10}
                          className="text-neutral-300 shrink-0"
                        />
                      )}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            if (openBreadcrumb === bc.path) {
                              setOpenBreadcrumb(null);
                              setBreadcrumbRect(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenBreadcrumb(bc.path);
                              setBreadcrumbRect({ top: rect.bottom, left: rect.left });
                            }
                          }}
                          className={`px-1.5 py-1 rounded hover:bg-neutral-100 transition-colors flex items-center gap-1 ${bc.isLast ? 'text-neutral-900 font-medium' : ''}`}
                        >
                          {bc.name}
                        </button>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {openBreadcrumb && breadcrumbRect && (
                  <>
                    <div
                      className="fixed inset-0 z-[90]"
                      onClick={() => {
                        setOpenBreadcrumb(null);
                        setBreadcrumbRect(null);
                      }}
                    />
                    <div
                      style={{
                        top: `${breadcrumbRect.top + 4}px`,
                        left: `${breadcrumbRect.left}px`,
                        position: 'fixed',
                      }}
                      className="w-48 bg-white border border-neutral-200 rounded-md shadow-lg z-[100] py-1 max-h-64 overflow-y-auto"
                    >
                      {(() => {
                        const bc = breadcrumbs.find((b) => b.path === openBreadcrumb);
                        if (!bc) return null;
                        const segments = bc.path.split('/');
                        const parentPath = segments.slice(0, -1).join('/');
                        const parentNode =
                          parentPath === '' ? { children: tree } : findNodeByPath(tree, parentPath);
                        return parentNode?.children?.map((child) => (
                          <button
                            key={child.path}
                            onClick={() => handleFileClick(child)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-100 flex items-center gap-2 truncate"
                          >
                            <HugeiconRenderer
                              icon={child.isDirectory ? Folder02Icon : File02Icon}
                              size={12}
                              className={child.isDirectory ? 'text-blue-500' : 'text-neutral-400'}
                            />
                            <span
                              className={
                                child.path === activeFile.path
                                  ? 'text-blue-600 font-medium'
                                  : 'text-neutral-700'
                              }
                            >
                              {child.name}
                            </span>
                          </button>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-auto text-sm relative">
                <CodeMirror
                  value={content}
                  height="100%"
                  theme="light"
                  extensions={getLanguage(activeFile.name)}
                  onChange={(value) => {
                    setContent(value);
                  }}
                  onUpdate={(viewUpdate) => {
                    if (viewUpdate.docChanged || viewUpdate.selectionSet) {
                      const state = viewUpdate.state;
                      const pos = state.selection.main.head;
                      const line = state.doc.lineAt(pos);
                      setCursorPos({ line: line.number, col: pos - line.from + 1 });
                    }
                  }}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    indentOnInput: true,
                  }}
                  className="h-full"
                />
              </div>

              <div className="h-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between px-3 shrink-0 text-[10px] text-neutral-500 font-medium">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 hover:text-neutral-900 cursor-default">
                    <HugeiconRenderer
                      icon={CloudSavingDone01Icon}
                      size={12}
                      className="text-green-500"
                    />
                    <span>In Sync</span>
                  </div>
                  <div className="flex items-center gap-1 hover:text-neutral-900 cursor-default">
                    <span>Spaces: 2</span>
                  </div>
                  <div className="flex items-center gap-1 hover:text-neutral-900 cursor-default uppercase">
                    <span>UTF-8</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 hover:text-neutral-900 cursor-default">
                    <span>
                      Ln {cursorPos.line}, Col {cursorPos.col}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 hover:text-neutral-900 cursor-default">
                    <span>{getLanguageName(activeFile.name)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-neutral-900 cursor-pointer text-blue-600">
                    <HugeiconRenderer icon={Tick01Icon} size={12} />
                    <span className="uppercase tracking-wider">Prettier</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8">
              <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                <HugeiconRenderer icon={File02Icon} size={32} />
              </div>
              <p className="text-sm">Select a file to start editing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
