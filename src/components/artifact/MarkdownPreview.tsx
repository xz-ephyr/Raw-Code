import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { createBaseComponents } from '@/components/markdown/sharedComponents';

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex, rehypeSanitize];

interface MarkdownPreviewProps {
  content: string;
}

const components = createBaseComponents();

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
