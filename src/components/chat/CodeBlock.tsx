import React, { useState, useMemo, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';

interface CodeBlockProps {
  content: string;
  language?: string;
}

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
  py3: 'python',
  rs: 'rust',
  rb: 'ruby',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
  txt: 'text',
  text: 'text',
  plaintext: 'text',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  gitignore: 'gitignore',
  env: 'env',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  xml: 'xml',
  svg: 'xml',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  makefile: 'makefile',
  gradle: 'gradle',
  kt: 'kotlin',
  kotlin: 'kotlin',
  kts: 'kotlin',
  dart: 'dart',
  go: 'go',
  swift: 'swift',
  scala: 'scala',
  r: 'r',
  lua: 'lua',
  perl: 'perl',
  pl: 'perl',
  php: 'php',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'c',
  hpp: 'cpp',
  java: 'java',
  cs: 'csharp',
  csharp: 'csharp',
  diff: 'diff',
  patch: 'diff',
};

const DIFF_THEME = EditorView.theme({
  '.cm-line': { paddingLeft: '8px' },
});
const DIFF_EXTENSIONS = [DIFF_THEME];

const langLoaders: Record<string, () => Promise<any[]>> = {
  javascript: () => import('@codemirror/lang-javascript').then(m => [m.javascript({ jsx: true, typescript: false })]),
  typescript: () => import('@codemirror/lang-javascript').then(m => [m.javascript({ jsx: true, typescript: true })]),
  html: () => import('@codemirror/lang-html').then(m => [m.html()]),
  css: () => import('@codemirror/lang-css').then(m => [m.css()]),
  json: () => import('@codemirror/lang-json').then(m => [m.json()]),
  python: () => import('@codemirror/lang-python').then(m => [m.python()]),
  rust: () => import('@codemirror/lang-rust').then(m => [m.rust()]),
  markdown: () => import('@codemirror/lang-markdown').then(m => [m.markdown()]),
};

const loadedExtensions = new Map<string, any[]>();

async function loadExtensions(lang: string): Promise<any[]> {
  if (loadedExtensions.has(lang)) return loadedExtensions.get(lang)!;
  const loader = langLoaders[lang];
  if (!loader) return [];
  const exts = await loader();
  loadedExtensions.set(lang, exts);
  return exts;
}

function normalizeContent(raw: string): string {
  return raw.replace(/\t/g, '  ');
}

const codeBlockTheme = EditorView.theme({
  '&': { padding: '0' },
  '.cm-scroller': { padding: '0', overflowX: 'auto' },
  '.cm-content': { padding: '12px 16px' },
  '.cm-line': { padding: '0' },
});

export const CodeBlock = React.memo(function CodeBlock({ content, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [extensions, setExtensions] = useState<any[]>([codeBlockTheme]);
  const normalized = useMemo(() => normalizeContent(content), [content]);

  useEffect(() => {
    const canonical = LANG_ALIASES[language || ''] || language || '';
    if (canonical === 'diff' || canonical === 'patch') {
      setExtensions([...DIFF_EXTENSIONS, codeBlockTheme]);
      return;
    }
    loadExtensions(canonical).then(exts => {
      setExtensions([...exts, codeBlockTheme]);
    });
  }, [language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full rounded-[6px] overflow-hidden my-4 bg-muted">
      {language && (
        <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted">
          {LANG_ALIASES[language] || language}
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className={`absolute top-1 right-1 p-1.5 rounded-[6px] transition-colors z-10 ${
              copied
                ? 'bg-green-900/30 text-green-400'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            aria-label="Copy code to clipboard"
          >
            <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Copy code</TooltipContent>
      </Tooltip>
      <CodeMirror
        value={normalized}
        theme="light"
        extensions={extensions}
        readOnly={true}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          bracketMatching: true,
          syntaxHighlighting: extensions.length > 0,
        }}
      />
    </div>
  );
});
