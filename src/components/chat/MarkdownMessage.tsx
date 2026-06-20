import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="text-[15px] leading-relaxed break-words text-neutral-900 transition-all duration-500">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            // Handle block code
            if (!inline && match) {
              return (
                <CodeBlock language={language} content={String(children).replace(/\n$/, '')} />
              );
            }
            // Handle inline code or generic code block without language
            if (!inline) {
              return <CodeBlock language="" content={String(children).replace(/\n$/, '')} />;
            }
            return (
              <code
                className="rounded bg-neutral-100/80 border border-neutral-200/50 px-1.5 py-0.5 text-[0.85em] text-neutral-800 font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-4 last:mb-0 animate-in fade-in slide-in-from-bottom-1 duration-300">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="animate-in fade-in slide-in-from-left-1 duration-300">{children}</li>;
          },
          h1({ children }) {
            return (
              <h1 className="text-2xl font-semibold mb-4 mt-6 text-neutral-900">{children}</h1>
            );
          },
          h2({ children }) {
            return <h2 className="text-xl font-semibold mb-3 mt-5 text-neutral-900">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mb-3 mt-4 text-neutral-900">{children}</h3>;
          },
          h4({ children }) {
            return (
              <h4 className="text-base font-semibold mb-2 mt-4 text-neutral-900">{children}</h4>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto mb-4 w-full">
                <table className="min-w-full divide-y divide-neutral-200 border border-neutral-200 rounded-lg">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-neutral-50/80">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider border-b border-neutral-200">
                {children}
              </th>
            );
          },
          tbody({ children }) {
            return <tbody className="bg-white divide-y divide-neutral-100">{children}</tbody>;
          },
          td({ children }) {
            return (
              <td className="px-4 py-2.5 whitespace-nowrap text-sm text-neutral-700">{children}</td>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-neutral-300 pl-4 py-1 italic text-neutral-600 mb-4 bg-neutral-50/50 rounded-r-lg">
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
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="my-6 border-neutral-200" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
