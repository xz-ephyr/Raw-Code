import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { rust } from '@codemirror/lang-rust';
import { EditorView } from '@codemirror/view';

interface CodeBlockProps {
  content: string;
  language?: string;
}

const getLanguage = (lang: string) => {
  switch (lang) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'javascript':
    case 'typescript':
      return [javascript({ jsx: true, typescript: true })];
    case 'html':
      return [html()];
    case 'css':
    case 'scss':
    case 'less':
      return [css()];
    case 'json':
      return [json()];
    case 'python':
    case 'py':
      return [python()];
    case 'rust':
    case 'rs':
      return [rust()];
    case 'md':
    case 'markdown':
      return [markdown()];
    default:
      return [javascript()];
  }
};

const noPaddingTheme = EditorView.theme({
  '&': { padding: '0' },
  '.cm-scroller': { padding: '0' },
  '.cm-content': { padding: '0' },
});

export const CodeBlock: React.FC<CodeBlockProps> = ({ content, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full rounded-[6px] overflow-hidden my-4 bg-neutral-50">
      {language && (
        <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-neutral-500 bg-neutral-50">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className={`absolute top-1 right-1 p-1.5 rounded-[6px] transition-colors z-10 ${
          copied
            ? 'bg-green-100 text-green-700'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
        }`}
        title="Copy code"
      >
        <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
      </button>
      <CodeMirror
        value={content}
        theme="light"
        extensions={[...getLanguage(language || ''), noPaddingTheme]}
        readOnly={true}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          bracketMatching: true,
          syntaxHighlighting: true,
        }}
      />
    </div>
  );
};
