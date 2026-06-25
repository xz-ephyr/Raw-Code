import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';
import { sass } from '@codemirror/lang-sass';
import { less } from '@codemirror/lang-less';
import { xml } from '@codemirror/lang-xml';
import { sql } from '@codemirror/lang-sql';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { vue } from '@codemirror/lang-vue';
import { angular } from '@codemirror/lang-angular';
import { yaml } from '@codemirror/lang-yaml';

type LangFn = () => import('@codemirror/language').LanguageSupport;

const languageMap: Record<string, LangFn> = {
  python,
  js: javascript,
  javascript,
  ts: () => javascript({ typescript: true }),
  typescript: () => javascript({ typescript: true }),
  jsx: () => javascript({ jsx: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  html,
  css,
  scss: sass,
  sass,
  less,
  json,
  xml,
  yaml,
  yml: yaml,
  md: markdown,
  markdown,
  sql,
  rust,
  cpp,
  c: cpp,
  java,
  php,
  vue,
  angular,
};

interface CodePreviewProps {
  content: string;
  language?: string;
  readOnly?: boolean;
}

export function CodePreview({ content, language, readOnly = true }: CodePreviewProps) {
  const extension = useMemo(() => {
    if (!language) return undefined;
    const langFn = languageMap[language.toLowerCase()];
    if (!langFn) return undefined;
    try {
      return langFn();
    } catch {
      return undefined;
    }
  }, [language]);

  return (
    <div className="h-full">
      <CodeMirror
        value={content}
        extensions={extension ? [extension] : []}
        theme={oneDark}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
        className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm dark:[&_.cm-editor]:bg-[#1a1a1a]"
      />
    </div>
  );
}
