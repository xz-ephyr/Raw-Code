import { Edit02Icon, Delete02Icon, Folder01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { WikiDocument } from '@/types/wiki';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { CodeBlock } from '../chat/CodeBlock';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../chat/Table';
import { WikiFolder } from '@/types/wiki';

interface WikiDocumentViewerProps {
  document: WikiDocument;
  folders: WikiFolder[];
  onEdit: (doc: WikiDocument) => void;
  onDelete: (id: string) => void;
}

function getWordCount(text: string): number {
  const words = text.trim().split(/\s+/);
  return words.filter(w => w.length > 0).length;
}

function getReadingTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200);
  if (minutes < 1) return '<1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

function handleExport(doc: WikiDocument) {
  const blob = new Blob([doc.content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function WikiDocumentViewer({ document, folders, onEdit, onDelete }: WikiDocumentViewerProps) {
  const wordCount = getWordCount(document.content);
  const readingTime = getReadingTime(wordCount);
  const folder = document.folderId ? folders.find(f => f.id === document.folderId) : null;

  return (
    <div className="overflow-y-auto h-full thin-scrollbar">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground leading-tight">{document.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
              {folder && (
                <>
                  <span className="flex items-center gap-1">
                    <HugeiconRenderer icon={Folder01Icon} size={12} />
                    {folder.name}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                </>
              )}
              <span>Created {new Date(document.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>Updated {new Date(document.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="tabular-nums">{wordCount} words</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>{readingTime} read</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExport(document)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-muted text-foreground rounded-[8px] hover:bg-muted/80 transition-colors cursor-pointer active:scale-[0.99] select-none"
              title="Export as Markdown"
            >
              <HugeiconRenderer icon={Download01Icon} size={16} />
              Export
            </button>
            <button
              type="button"
              onClick={() => onEdit(document)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-muted text-foreground rounded-[8px] hover:bg-muted/80 transition-colors cursor-pointer active:scale-[0.99] select-none"
            >
              <HugeiconRenderer icon={Edit02Icon} size={16} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(document.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-destructive/10 text-destructive rounded-[8px] hover:bg-destructive/20 transition-colors cursor-pointer active:scale-[0.99] select-none"
            >
              <HugeiconRenderer icon={Delete02Icon} size={16} />
              Delete
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <div className="text-[15px] leading-relaxed break-words text-foreground">
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
                li({ children }) {
                  return <li>{children}</li>;
                },
                h1({ children }) {
                  return (
                    <h1 className="text-2xl font-semibold mb-4 mt-6 text-foreground">{children}</h1>
                  );
                },
                h2({ children }) {
                  return <h2 className="text-xl font-semibold mb-3 mt-5 text-foreground">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-lg font-semibold mb-3 mt-4 text-foreground">{children}</h3>;
                },
                h4({ children }) {
                  return (
                    <h4 className="text-base font-semibold mb-2 mt-4 text-foreground">{children}</h4>
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
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-border pl-4 py-1 italic text-muted-foreground mb-4 bg-muted/50 rounded-r-lg">
                      {children}
                    </blockquote>
                  );
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                      {children}
                    </a>
                  );
                },
                hr() {
                  return <hr className="my-6 border-border" />;
                },
              }}
            >
              {document.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
