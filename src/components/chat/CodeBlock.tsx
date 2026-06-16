import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';

interface CodeBlockProps {
  content: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-4 bg-neutral-800">
      {language && (
        <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-neutral-400 bg-neutral-900/50 border-b border-neutral-700">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-700 text-neutral-300 hover:bg-neutral-600 hover:text-white transition-colors z-10"
        title="Copy code"
      >
        <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
      </button>
      <pre className="overflow-x-auto p-4 text-sm text-neutral-100 font-mono">
        <code>{content}</code>
      </pre>
    </div>
  );
};
