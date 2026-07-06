import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { WikiDocument, WikiFolder } from '@/types/wiki';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { CodeBlock } from '../chat/CodeBlock';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../chat/Table';
import {
  EyeIcon, Edit02Icon, Folder01Icon,
  BoldIcon, TextItalicIcon, HeadingIcon,
  CodeIcon, BulletIcon, LeftToRightListNumberIcon,
  Link01Icon, QuotesIcon,
} from '@hugeicons/core-free-icons';

interface WikiEditorProps {
  editDoc?: WikiDocument | null;
  folders: WikiFolder[];
  currentFolderId?: string | null;
  onSave: (data: { title: string; content: string; folderId?: string | null }) => void;
  onCancel: () => void;
}

type ToolbarAction = {
  icon: typeof BoldIcon;
  label: string;
  action: (ta: HTMLTextAreaElement, value: string, setValue: (v: string) => void) => void;
};

function wrapSelection(ta: HTMLTextAreaElement, wrapper: string): string {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = ta.value;
  const selected = text.substring(start, end);
  return text.substring(0, start) + wrapper + selected + wrapper + text.substring(end);
}

function insertAroundLine(ta: HTMLTextAreaElement, prefix: string): string {
  const start = ta.selectionStart;
  const text = ta.value;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = text.indexOf('\n', start);
  const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
  return text.substring(0, lineStart) + prefix + line + text.substring(lineEnd === -1 ? text.length : lineEnd);
}

function insertAtCursor(ta: HTMLTextAreaElement, insertion: string): string {
  const start = ta.selectionStart;
  const text = ta.value;
  return text.substring(0, start) + insertion + text.substring(ta.selectionEnd);
}

function insertBeforeEachLine(ta: HTMLTextAreaElement, prefix: string): string {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = ta.value;
  const selected = text.substring(start, end);
  if (!selected) {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    return text.substring(0, lineStart) + prefix + text.substring(lineStart);
  }
  const lines = selected.split('\n');
  const wrapped = lines.map(l => l.trim() ? prefix + l : l).join('\n');
  return text.substring(0, start) + wrapped + text.substring(end);
}

const toolbarActions: ToolbarAction[] = [
  {
    icon: BoldIcon, label: 'Bold',
    action: (ta, _v, setV) => setV(wrapSelection(ta, '**')),
  },
  {
    icon: TextItalicIcon, label: 'Italic',
    action: (ta, _v, setV) => setV(wrapSelection(ta, '_')),
  },
  {
    icon: HeadingIcon, label: 'Heading',
    action: (ta, _v, setV) => setV(insertAroundLine(ta, '## ')),
  },
  {
    icon: CodeIcon, label: 'Code block',
    action: (ta, _v, setV) => setV(wrapSelection(ta, '`')),
  },
  {
    icon: BulletIcon, label: 'Bullet list',
    action: (ta, _v, setV) => setV(insertBeforeEachLine(ta, '- ')),
  },
  {
    icon: LeftToRightListNumberIcon, label: 'Numbered list',
    action: (ta, _v, setV) => setV(insertBeforeEachLine(ta, '1. ')),
  },
  {
    icon: QuotesIcon, label: 'Blockquote',
    action: (ta, _v, setV) => setV(insertBeforeEachLine(ta, '> ')),
  },
  {
    icon: Link01Icon, label: 'Link',
    action: (ta, _v, setV) => {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = ta.value.substring(start, end);
      if (selected) {
        setV(wrapSelection(ta, '[') + '](url)'.substring(0));
        // Actually wrap properly:
        const text = ta.value;
        setV(text.substring(0, start) + '[' + selected + '](url)' + text.substring(end));
      } else {
        setV(insertAtCursor(ta, '[link text](url)'));
      }
    },
  },
];

export function WikiEditor({ editDoc, folders, currentFolderId, onSave, onCancel }: WikiEditorProps) {
  const [title, setTitle] = useState(editDoc?.title ?? '');
  const [content, setContent] = useState(editDoc?.content ?? '');
  const [folderId, setFolderId] = useState<string | null | undefined>(editDoc?.folderId ?? currentFolderId ?? null);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToolbarAction = useCallback((action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    action.action(ta, content, setContent);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start;
      ta.selectionEnd = start;
    });
  }, [content]);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave({ title: title.trim(), content: content.trim(), folderId });
  };

  return (
    <div className="bg-card border border-border rounded-[12px] overflow-hidden">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-bold text-foreground mb-6">
          {editDoc ? 'Edit document' : 'New document'}
        </h2>
      </div>

      <div className="px-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</label>
          <input
            type="text"
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-muted rounded-[8px] py-2.5 px-3.5 text-sm focus:outline-none placeholder:text-muted-foreground border border-border focus:border-ring transition-all"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Folder</label>
          <div className="relative">
            <HugeiconRenderer icon={Folder01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="w-full bg-muted rounded-[8px] py-2.5 pl-9 pr-8 text-sm focus:outline-none border border-border focus:border-ring transition-all appearance-none cursor-pointer"
            >
              <option value="">Uncategorized</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content</label>
            <div className="flex items-center bg-muted rounded-[6px] p-0.5">
              <button
                type="button"
                onClick={() => setPreview(false)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-[4px] transition-colors cursor-pointer ${!preview ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <HugeiconRenderer icon={Edit02Icon} size={12} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-[4px] transition-colors cursor-pointer ${preview ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <HugeiconRenderer icon={EyeIcon} size={12} />
                Preview
              </button>
            </div>
          </div>
          {preview ? (
            <div className="w-full bg-muted rounded-[8px] px-3.5 py-3 text-sm border border-border min-h-[320px] prose prose-sm dark:prose-invert max-w-none overflow-y-auto">
              {content.trim() ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre({ children }) {
                      return <div className="w-full">{children}</div>;
                    },
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      if (!inline && match) {
                        return (
                          <CodeBlock language={language} content={String(children).replace(/\n$/, '')} />
                        );
                      }
                      if (!inline) {
                        return <CodeBlock language="" content={String(children).replace(/\n$/, '')} />;
                      }
                      return <code {...props}>{children}</code>;
                    },
                    p({ children }) {
                      return <div className="mb-4 last:mb-0">{children}</div>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>;
                    },
                    h1({ children }) {
                      return <h1 className="text-2xl font-semibold mb-4 mt-6 text-foreground">{children}</h1>;
                    },
                    h2({ children }) {
                      return <h2 className="text-xl font-semibold mb-3 mt-5 text-foreground">{children}</h2>;
                    },
                    h3({ children }) {
                      return <h3 className="text-lg font-semibold mb-3 mt-4 text-foreground">{children}</h3>;
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-4 border-border pl-4 py-1 italic text-muted-foreground mb-4 bg-muted/50 rounded-r-lg">
                          {children}
                        </blockquote>
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                          {children}
                        </a>
                      );
                    },
                    table({ children, ...props }) {
                      return <Table {...props}>{children}</Table>;
                    },
                    thead({ children, ...props }) {
                      return <TableHead {...props}>{children}</TableHead>;
                    },
                    tbody({ children, ...props }) {
                      return <TableBody {...props}>{children}</TableBody>;
                    },
                    tr({ children, ...props }) {
                      return <TableRow {...props}>{children}</TableRow>;
                    },
                    th({ children, ...props }) {
                      return <TableHeaderCell {...props}>{children}</TableHeaderCell>;
                    },
                    td({ children, ...props }) {
                      return <TableCell {...props}>{children}</TableCell>;
                    },
                    hr() {
                      return <hr className="my-6 border-border" />;
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              <div className="flex items-center gap-0.5 px-2 py-1.5 bg-muted rounded-t-[8px] border border-border border-b-0 flex-wrap">
                {toolbarActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleToolbarAction(action)}
                    className="p-1.5 rounded-[4px] hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer active:scale-[0.95]"
                    title={action.label}
                  >
                    <HugeiconRenderer icon={action.icon} size={14} />
                  </button>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                placeholder="Write your document content in Markdown..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-muted rounded-b-[8px] py-2.5 px-3.5 text-sm focus:outline-none placeholder:text-muted-foreground border border-border focus:border-ring transition-all min-h-[320px] resize-y leading-relaxed font-mono rounded-t-none"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-border px-6 pb-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium bg-muted text-foreground rounded-[8px] transition-all hover:bg-muted/70 cursor-pointer active:scale-[0.99] select-none"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-[8px] transition-all hover:bg-accent/80 cursor-pointer active:scale-[0.99] select-none"
        >
          {editDoc ? 'Save changes' : 'Create document'}
        </button>
      </div>
    </div>
  );
}
