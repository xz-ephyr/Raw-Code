import { memo, Fragment, useMemo, useDeferredValue, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';
import type { PluggableList } from 'unified';
import { CodeBlock } from './CodeBlock';
import { InlineSourcePill } from './InlineSourcePill';
import { MermaidBlock } from './MermaidBlock';
import { MarkdownErrorBoundary } from './MarkdownErrorBoundary';
import { createBaseComponents } from '@/components/markdown/sharedComponents';

const citationRegex = /【([^】]+)】/g;

interface SourceInfo {
  url: string;
  title: string;
  snippet?: string;
}

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

function isSafeUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  try {
    const url = new URL(uri, window.location.origin);
    return ALLOWED_PROTOCOLS.includes(url.protocol) ? uri : undefined;
  } catch {
    return undefined;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

function buildSourceIndex(sources: SourceInfo[]): {
  byUrl: Map<string, SourceInfo>;
  byIndex: Map<number, SourceInfo>;
  byTitleLower: Map<string, SourceInfo[]>;
} {
  const byUrl = new Map<string, SourceInfo>();
  const byIndex = new Map<number, SourceInfo>();
  const byTitleLower = new Map<string, SourceInfo[]>();

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (s.url) byUrl.set(s.url, s);
    byIndex.set(i + 1, s);
    const lower = s.title.toLowerCase();
    if (!byTitleLower.has(lower)) byTitleLower.set(lower, []);
    byTitleLower.get(lower)!.push(s);
  }

  return { byUrl, byIndex, byTitleLower };
}

function lookupCitation(text: string, index: SourceIndex): SourceInfo | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return index.byUrl.get(trimmed);
  }

  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1) {
    return index.byIndex.get(num);
  }

  const lower = trimmed.toLowerCase();
  const matches = index.byTitleLower.get(lower);
  if (matches) return matches[0];

  for (const [, sources] of index.byTitleLower) {
    for (const s of sources) {
      if (s.title.toLowerCase().includes(lower)) return s;
    }
  }

  return undefined;
}

type SourceIndex = ReturnType<typeof buildSourceIndex>;

function needsClosingFence(content: string): boolean {
  const lines = content.split('\n');
  let inFence = false;
  for (const line of lines) {
    if (/^ {0,3}```/.test(line)) {
      inFence = !inFence;
    }
  }
  return inFence;
}

function prepareStreamingContent(content: string): string {
  const trimmed = content;
  if (!trimmed) return trimmed;

  if (needsClosingFence(trimmed)) {
    return trimmed + '\n```';
  }

  const incompleteCitation = /【[^】]*$/m;
  if (incompleteCitation.test(trimmed)) {
    return trimmed.replace(incompleteCitation, '');
  }

  return trimmed;
}

function remarkCitations() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || typeof index !== 'number') return;

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

      parent.children.splice(index, 1, ...newNodes);
      return index + newNodes.length - 1;
    });

    function groupCitationsInNode(node: any) {
      if (!node.children || !Array.isArray(node.children)) return;

      const newChildren: any[] = [];
      let pendingCitations: string[] = [];

      for (const child of node.children) {
        if (child.type === 'citation') {
          pendingCitations.push(child.data.hProperties.citation);
        } else {
          if (pendingCitations.length > 0) {
            newChildren.push({
              type: 'citation-group',
              data: {
                hName: 'citation-group',
                hProperties: { citations: [...new Set(pendingCitations)] },
              },
            });
            pendingCitations = [];
          }
          newChildren.push(child);
          groupCitationsInNode(child);
        }
      }

      if (pendingCitations.length > 0) {
        newChildren.push({
          type: 'citation-group',
          data: {
            hName: 'citation-group',
            hProperties: { citations: [...new Set(pendingCitations)] },
          },
        });
      }

      node.children = newChildren;
    }

    groupCitationsInNode(tree);
  };
}

const REMARK_PLUGINS = [remarkGfm, remarkBreaks, remarkMath, remarkCitations];
const REHYPE_PLUGINS: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema.tagNames || []),
      'citation',
      'citation-group',
    ],
    attributes: {
      ...defaultSchema.attributes,
      citation: ['citation'],
      'citation-group': ['citations'],
      code: ['className'],
      span: ['className', 'style'],
      '*': ['className', 'style', 'id', 'role', 'aria-label'],
    },
  }],
  rehypeKatex,
];

interface MarkdownMessageProps {
  content: string;
  sources?: SourceInfo[];
}

export const MarkdownMessage = memo(function MarkdownMessage({ content, sources = [] }: MarkdownMessageProps) {
  const deferredContent = useDeferredValue(content);
  const prepared = useMemo(() => prepareStreamingContent(deferredContent), [deferredContent]);
  const hasCitations = useMemo(() => prepared.includes('【'), [prepared]);

  const sourceIndex = useMemo(() => buildSourceIndex(sources), [sources]);

  const markdownComponents = useMemo(() => {
    const overrides: Record<string, any> = {
      code({ node, className, children, ...props }: any) {
        const hasPreParent = node?.parent?.tagName === 'pre';
        const isInline = !hasPreParent;
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';
        const codeContent = String(children).replace(/\n$/, '');

        if (language === 'mermaid') {
          return <MermaidBlock content={codeContent} />;
        }

        if (!isInline && match) {
          return <CodeBlock language={language} content={codeContent} />;
        }
        if (!isInline) {
          return <CodeBlock language="" content={codeContent} />;
        }
        return <code {...props}>{children}</code>;
      },
      ul({ children }: { children: ReactNode }) {
        return <ul className="list-disc pl-5 mb-4 space-y-1 [&_.task-list-item]:list-none [&_.task-list-item]:-ml-5">{children}</ul>;
      },
      li({ children }: { children: ReactNode }) {
        return <li className="[&>input[type=checkbox]]:mr-2 [&>input[type=checkbox]]:accent-primary [&>input[type=checkbox]]:translate-y-[1px]">{children}</li>;
      },
      input({ type, checked, ...props }: any) {
        return (
          <input
            type={type || 'checkbox'}
            checked={checked}
            {...props}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          />
        );
      },
      h1({ children }: any) {
        const id = slugify(String(children));
        return (
          <h1 id={id} className="text-2xl font-semibold mb-4 mt-6 text-foreground scroll-mt-20">
            {children}
          </h1>
        );
      },
      h2({ children }: any) {
        const id = slugify(String(children));
        return (
          <h2 id={id} className="text-xl font-semibold mb-3 mt-5 text-foreground scroll-mt-20">
            {children}
          </h2>
        );
      },
      h3({ children }: any) {
        const id = slugify(String(children));
        return (
          <h3 id={id} className="text-lg font-semibold mb-3 mt-4 text-foreground scroll-mt-20">
            {children}
          </h3>
        );
      },
      h4({ children }: any) {
        const id = slugify(String(children));
        return (
          <h4 id={id} className="text-base font-semibold mb-2 mt-4 text-foreground scroll-mt-20">
            {children}
          </h4>
        );
      },
      a({ href, children }: any) {
        const safeHref = isSafeUri(href);
        if (!safeHref) {
          return <span className="text-muted-foreground line-through">{children}</span>;
        }
        const isExternal = safeHref.startsWith('http');
        return (
          <a
            href={safeHref}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
          >
            {children}
            {isExternal && (
              <span className="sr-only"> (opens in new tab)</span>
            )}
          </a>
        );
      },
      img({ src, alt }: any) {
        const safeSrc = isSafeUri(src);
        if (!safeSrc) {
          return (
            <span className="inline-block text-xs text-muted-foreground italic border border-dashed border-border px-2 py-1 rounded my-1">
              {alt || 'Blocked image'}
            </span>
          );
        }
        return (
          <img
            src={safeSrc}
            alt={alt || ''}
            className="inline-block max-h-48 w-auto rounded border border-border my-1 mr-2"
            loading="lazy"
          />
        );
      },
      'citation-group'({ citations = [] }: { citations?: string[] }) {
        const matched = citations
          .map((c) => ({ key: c, source: lookupCitation(c, sourceIndex) }))
          .filter((m): m is { key: string; source: SourceInfo } => !!m.source);

        if (matched.length === 0) {
          return (
            <span className="inline-flex items-center text-[11px] text-muted-foreground/60 mx-0.5">
              【{citations.join(',')}】
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-0.5 mx-0.5 align-middle" role="group" aria-label={`${matched.length} sources`}>
            {matched.map((m, i) => (
              <Fragment key={m.key}>
                {i > 0 && <span className="text-muted-foreground/40 text-[10px]">,</span>}
                <InlineSourcePill
                  url={m.source.url}
                  title={m.source.title}
                  snippet={m.source.snippet}
                />
              </Fragment>
            ))}
          </span>
        );
      },
    };

    const base = createBaseComponents(overrides);

    if (hasCitations) {
      (base as any).citation = ({ citation = '' }: { citation?: string }) => {
        const matched = lookupCitation(citation, sourceIndex);
        if (matched) {
          return (
            <InlineSourcePill
              url={matched.url}
              title={matched.title}
              snippet={matched.snippet}
            />
          );
        }
        return <span className="text-muted-foreground/50 text-[11px] mx-0.5">【{citation}】</span>;
      };
    }

    return base;
  }, [hasCitations, sourceIndex]);

  return (
    <MarkdownErrorBoundary>
      <div className="text-[15px] leading-relaxed break-words text-foreground [&>p]:my-0">
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={markdownComponents}
        >
          {prepared}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
});
