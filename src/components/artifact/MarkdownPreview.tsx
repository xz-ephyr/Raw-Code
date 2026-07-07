import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { CodeBlock } from '../chat/CodeBlock';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../chat/Table';

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex, rehypeSanitize];

interface MarkdownPreviewProps {
  content: string;
}

const components: Components = {
  pre({ children }) {
    return <div className="w-full">{children}</div>;
  },
  code({ node, className, children, ...props }) {
    const parent = (node as any)?.parent;
    const isInline = !parent || parent.tagName !== 'pre';
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    if (!isInline && match) {
      return (
        <CodeBlock language={language} content={String(children).replace(/\n$/, '')} />
      );
    }
    if (!isInline) {
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
        aria-label={typeof children === 'string' ? `${children} (opens in new tab)` : undefined}
        className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
      >
        {children}
      </a>
    );
  },
  hr() {
    return <hr className="my-6 border-border" />;
  },
};

export const MarkdownPreview = memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content) return null;

  return (
    <div className="p-6 text-[15px] leading-relaxed break-words text-foreground">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
