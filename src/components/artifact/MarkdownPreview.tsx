import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview = memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none p-6 text-sm dark:text-neutral-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
