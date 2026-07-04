import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../chat/CodeBlock';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../chat/Table';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview = memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="p-6 text-[15px] leading-relaxed break-words text-neutral-100 text-neutral-300">
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
            return (
              <code
                className="rounded bg-neutral-800/80 border border-neutral-700/50 px-1.5 py-0.5 text-[0.85em] text-neutral-200 font-mono"
                {...props}
              >
                {children}
              </code>
            );
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
              <h1 className="text-2xl font-semibold mb-4 mt-6 text-neutral-100 text-neutral-100">{children}</h1>
            );
          },
          h2({ children }) {
            return <h2 className="text-xl font-semibold mb-3 mt-5 text-neutral-100 text-neutral-100">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mb-3 mt-4 text-neutral-100 text-neutral-100">{children}</h3>;
          },
          h4({ children }) {
            return (
              <h4 className="text-base font-semibold mb-2 mt-4 text-neutral-100 text-neutral-100">{children}</h4>
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
              <blockquote className="border-l-4 border-neutral-600 pl-4 py-1 italic text-neutral-400 mb-4 bg-neutral-900/50 rounded-r-lg">
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
            return <hr className="my-6 border-neutral-700" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
