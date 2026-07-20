import { useState } from 'react';
import type { Components } from 'react-markdown';
import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { CodeBlock } from '../chat/CodeBlock';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../chat/Table';

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  const el = node as any;
  if (el.props?.children) return extractText(el.props.children);
  return '';
}

export function createBaseComponents(overrides?: Partial<Components>): Components {
  const base: Components = {
    pre({ children }) {
      return <div className="w-full">{children}</div>;
    },
    code({ node, inline, className, children, ...props }: any) {
      const hasPreParent = node?.parent?.tagName === 'pre';
      const isInline = inline !== undefined ? inline : !hasPreParent;
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
      const [copied, setCopied] = useState(false);
      const handleCopy = () => {
        const text = extractText(children);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      };
      return (
        <blockquote className="relative w-full rounded-lg overflow-hidden my-4 bg-muted p-4 pt-3 text-foreground not-italic">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className={`absolute top-1.5 right-1.5 p-1.5 rounded-[6px] transition-colors z-10 ${
                  copied
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                aria-label="Copy quote to clipboard"
              >
                <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Copy quote</TooltipContent>
          </Tooltip>
          <div className="pr-8">
            {children}
          </div>
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
    ...overrides,
  };
  return base;
}
