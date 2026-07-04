import { memo, Fragment, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { CodeBlock } from './CodeBlock';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from './Table';
import { InlineSourcePill } from './InlineSourcePill';

/**
 * Custom remark plugin to identify and tag citations in the markdown tree.
 * It transforms text containing 【...】 into custom 'citation' nodes.
 */
function remarkCitations() {
  return (tree: any) => {
    visit(tree, 'text', (node, index, parent) => {
      const parts = node.value.split(citationRegex);
      if (parts.length <= 1) return;

      const newNodes: any[] = [];
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          if (parts[i]) {
            newNodes.push({ type: 'text', value: parts[i] });
          }
        } else {
          newNodes.push({
            type: 'citation',
            data: {
              hName: 'citation',
              hProperties: { citation: parts[i] },
            },
          });
        }
      }

      parent.children.splice(index as number, 1, ...newNodes);
      return (index as number) + newNodes.length;
    });
  };
}

const REMARK_PLUGINS = [remarkGfm, remarkCitations];

interface SourceInfo {
  url: string;
  title: string;
  snippet?: string;
}

interface MarkdownMessageProps {
  content: string;
  sources?: SourceInfo[];
}

const citationRegex = /【([^】]+)】/g;

function matchCitation(text: string, sources: SourceInfo[]): SourceInfo | undefined {
  const trimmed = text.trim();
  if (!trimmed || sources.length === 0) return undefined;

  // Try URL match
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return sources.find(s => s.url === trimmed);
  }

  // Try index match: 【1】 → sources[0]
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= sources.length) {
    return sources[num - 1];
  }

  // Try title match (substring, case-insensitive)
  const lower = trimmed.toLowerCase();
  return sources.find(s =>
    s.title.toLowerCase().includes(lower) ||
    lower.includes(s.title.toLowerCase())
  );
}

export const MarkdownMessage = memo(function MarkdownMessage({ content, sources = [] }: MarkdownMessageProps) {
  const sanitized = content.replace(/<br\s*\/?>/gi, '\n');

  const hasCitations = citationRegex.test(sanitized);
  citationRegex.lastIndex = 0;

  const components = useMemo(() => {
    if (!hasCitations) return markdownComponents;

    return {
      ...markdownComponents,
      citation({ citation }: { citation: string }) {
        const matched = matchCitation(citation, sources);
        if (matched) {
          return (
            <InlineSourcePill
              url={matched.url}
              title={matched.title}
              snippet={matched.snippet}
            />
          );
        }
        return <Fragment>【{citation}】</Fragment>;
      },
    } as any;
  }, [hasCitations, sources]);

  return (
    <div className="text-[15px] leading-relaxed break-words text-neutral-100 [&>p]:my-0">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={components}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
});

const markdownComponents = {
  pre({ children }: any) {
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
  p({ children }: any) {
    return <div className="mb-4 last:mb-0">{children}</div>;
  },
  ul({ children }: any) {
    return <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>;
  },
  li({ children }: any) {
    return <li>{children}</li>;
  },
  h1({ children }: any) {
    return (
      <h1 className="text-2xl font-semibold mb-4 mt-6 text-neutral-100">{children}</h1>
    );
  },
  h2({ children }: any) {
    return <h2 className="text-xl font-semibold mb-3 mt-5 text-neutral-100">{children}</h2>;
  },
  h3({ children }: any) {
    return <h3 className="text-lg font-semibold mb-3 mt-4 text-neutral-100">{children}</h3>;
  },
  h4({ children }: any) {
    return (
      <h4 className="text-base font-semibold mb-2 mt-4 text-neutral-100">{children}</h4>
    );
  },
  table({ children, ...props }: any) {
    return <Table {...props}>{children}</Table>;
  },
  thead({ children, ...props }: any) {
    return <TableHead {...props}>{children}</TableHead>;
  },
  tbody({ children, ...props }: any) {
    return <TableBody {...props}>{children}</TableBody>;
  },
  tr({ children, ...props }: any) {
    return <TableRow {...props}>{children}</TableRow>;
  },
  th({ children, ...props }: any) {
    return <TableHeaderCell {...props}>{children}</TableHeaderCell>;
  },
  td({ children, ...props }: any) {
    return <TableCell {...props}>{children}</TableCell>;
  },
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-4 border-neutral-600 pl-4 py-1 italic text-neutral-400 mb-4 bg-neutral-800/50 rounded-r-lg">
        {children}
      </blockquote>
    );
  },
  a({ href, children }: any) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
      >
        {children}
      </a>
    );
  },
  hr() {
    return <hr className="my-6 border-neutral-700" />;
  },
  img({ src, alt }: any) {
    return (
      <img
        src={src}
        alt={alt || ''}
        className="inline-block max-h-48 w-auto rounded border border-neutral-700 my-1 mr-2"
        loading="lazy"
      />
    );
  },
};
