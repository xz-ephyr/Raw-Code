import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { PluggableList } from 'unified';
import { createBaseComponents } from '@/components/markdown/sharedComponents';
import { CodeBlock } from '../chat/CodeBlock';
import { MermaidBlock } from '../chat/MermaidBlock';

const REMARK_PLUGINS = [remarkGfm, remarkBreaks, remarkMath];
const REHYPE_PLUGINS: PluggableList = [
  [rehypeSanitize, {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      code: ['className'],
      span: ['className', 'style'],
      '*': ['className', 'style', 'id', 'role', 'aria-label'],
    },
  }],
  rehypeKatex,
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview = memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const components = useMemo(() => {
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
          <h3 id={id} className="text-lg font-semibold mb-2 mt-4 text-foreground scroll-mt-20">
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
      h5({ children }: any) {
        const id = slugify(String(children));
        return (
          <h5 id={id} className="text-sm font-semibold mb-1 mt-3 text-foreground scroll-mt-20">
            {children}
          </h5>
        );
      },
      h6({ children }: any) {
        const id = slugify(String(children));
        return (
          <h6 id={id} className="text-sm font-semibold mb-1 mt-3 text-foreground scroll-mt-20">
            {children}
          </h6>
        );
      },
      a({ href, children }: any) {
        const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
        return (
          <a
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
          >
            {children}
            {isExternal && <span className="sr-only"> (opens in new tab)</span>}
          </a>
        );
      },
    };

    return createBaseComponents(overrides);
  }, []);

  if (!content) return null;

  return (
    <div className="p-6 text-[15px] leading-relaxed break-words text-foreground [&>p]:my-0">
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
