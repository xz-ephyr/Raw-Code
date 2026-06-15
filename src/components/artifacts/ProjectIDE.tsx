import React, { useState, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { sass } from '@codemirror/lang-sass';

import {
  Folder02Icon,
  File02Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Search01Icon,
  ArrowRight01Icon,
  Tick01Icon,
  CloudSavingDone01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { FileEntry, FileSystemService } from '../../services/FileSystemService';
import { Project } from '../../types/chat';

interface ProjectIDEProps {
  project: Project;
  onClose: () => void;
  onSave?: (path: string, content: string) => void;
}

const HugeiconRenderer = ({ icon: Icon, size = 16, className }: { icon: any, size?: number, className?: string }) => (
  <HugeiconsIcon icon={Icon} size={size} color="currentColor" strokeWidth={1.5} className={className} />
);

const FileNode = ({ node, depth = 0, activePath, onClick }: { node: FileEntry, depth?: number, activePath?: string, onClick: (node: FileEntry) => void }) => (
  <div>
    <div
      className={`flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 cursor-pointer text-sm ${activePath === node.path ? 'bg-neutral-100 text-blue-600 font-medium' : 'text-neutral-600'}`}
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
      onClick={() => onClick(node)}
    >
      <HugeiconRenderer icon={node.isDirectory ? Folder02Icon : File02Icon} size={14} />
      <span className="truncate">{node.name}</span>
    </div>
    {node.isDirectory && node.children?.map(child => (
      <FileNode key={child.path} node={child} depth={depth + 1} activePath={activePath} onClick={onClick} />
    ))}
  </div>
);

export const ProjectIDE: React.FC<ProjectIDEProps> = ({ project, onClose, onSave }) => {
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<FileEntry | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [openBreadcrumb, setOpenBreadcrumb] = useState<string | null>(null);

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

  const getLanguageName = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return 'JavaScript';
      case 'jsx': return 'JavaScript React';
      case 'ts': return 'TypeScript';
      case 'tsx': return 'TypeScript React';
      case 'py': return 'Python';
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      case 'scss': return 'SCSS';
      case 'json': return 'JSON';
      case 'rs': return 'Rust';
      case 'md': return 'Markdown';
      default: return ext?.toUpperCase() || 'Plain Text';
    }
  };

  const getLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return [javascript({ jsx: true, typescript: true })];
      case 'py':
        return [python()];
      case 'html':
        return [html()];
      case 'css':
        return [css()];
      case 'scss':
      case 'sass':
        return [sass()];
      case 'json':
        return [json()];
      case 'rs':
        return [rust()];
      case 'cpp':
      case 'h':
      case 'hpp':
      case 'cc':
        return [cpp()];
      case 'java':
        return [java()];
      case 'php':
        return [php()];
      case 'sql':
        return [sql()];
      case 'xml':
      case 'svg':
        return [xml()];
      case 'yaml':
      case 'yml':
        return [yaml()];
      case 'md':
        return [markdown()];
      default:
        return [];
    }
  };

  const breadcrumbs = useMemo(() => {
    if (!activeFile) return [];
    const relativePath = activeFile.path.replace(project.path, '').replace(/^[/\\]/, '');
    const parts = relativePath.split(/[/\\]/);
    return parts.map((name, index) => ({
      name,
      path: parts.slice(0, index + 1).join('/'),
      isLast: index === parts.length - 1
    }));
  }, [activeFile, project.path]);

  const findNodeByPath = (nodes: FileEntry[], path: string): FileEntry | null => {
    for (const node of nodes) {
      if (node.path.endsWith(path)) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className="w-full h-full border-l border-neutral-200 bg-white flex flex-col z-20 font-sans">
      {/* Header */}
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
        {/* Sidebar / Explorer */}
        <div className="w-60 border-r border-neutral-200 overflow-y-auto bg-[#f8f9fa] py-2 shrink-0">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Explorer</span>
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
          {tree.map(node => (
            <FileNode key={node.path} node={node} activePath={activeFile?.path} onClick={handleFileClick} />
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {activeFile ? (
            <>
              {/* Breadcrumbs */}
              <div className="h-9 border-b border-neutral-200 flex items-center px-3 bg-white shrink-0 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  {breadcrumbs.map((bc, i) => (
                    <React.Fragment key={bc.path}>
                      {i > 0 && <HugeiconRenderer icon={ArrowRight01Icon} size={10} className="text-neutral-300" />}
                      <div className="relative">
                        <button
                          onClick={() => setOpenBreadcrumb(openBreadcrumb === bc.path ? null : bc.path)}
                          className={`px-1.5 py-1 rounded hover:bg-neutral-100 transition-colors flex items-center gap-1 ${bc.isLast ? 'text-neutral-900 font-medium' : ''}`}
                        >
                          {bc.name}
                        </button>

                        {openBreadcrumb === bc.path && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-neutral-200 rounded-md shadow-lg z-[100] py-1 max-h-64 overflow-y-auto">
                            {(() => {
                              const segments = bc.path.split('/');
                              const parentPath = segments.slice(0, -1).join('/');
                              const parentNode = parentPath === '' ? { children: tree } : findNodeByPath(tree, parentPath);
                              return parentNode?.children?.map(child => (
                                <button
                                  key={child.path}
                                  onClick={() => handleFileClick(child)}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-100 flex items-center gap-2 truncate"
                                >
                                  <HugeiconRenderer icon={child.isDirectory ? Folder02Icon : File02Icon} size={12} className={child.isDirectory ? 'text-blue-500' : 'text-neutral-400'} />
                                  <span className={child.path === activeFile.path ? 'text-blue-600 font-medium' : 'text-neutral-700'}>{child.name}</span>
                                </button>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
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

              {/* Status Bar */}
              <div className="h-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between px-3 shrink-0 text-[10px] text-neutral-500 font-medium">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 hover:text-neutral-900 cursor-default">
                    <HugeiconRenderer icon={CloudSavingDone01Icon} size={12} className="text-green-500" />
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
                    <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
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
