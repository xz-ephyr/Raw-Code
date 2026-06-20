import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { sass } from '@codemirror/lang-sass';
export const getLanguageName = (f: string) => {
  const ext = f.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': return 'JavaScript'; case 'jsx': return 'JavaScript React';
    case 'ts': return 'TypeScript'; case 'tsx': return 'TypeScript React';
    case 'py': return 'Python'; case 'html': return 'HTML'; case 'css': return 'CSS';
    case 'scss': return 'SCSS'; case 'json': return 'JSON'; case 'rs': return 'Rust';
    case 'md': return 'Markdown'; default: return ext?.toUpperCase() || 'Plain Text';
  }
};
export const getLanguage = (f: string) => {
  const ext = f.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': case 'jsx': case 'ts': case 'tsx': return [javascript({ jsx: true, typescript: true })];
    case 'py': return [python()]; case 'html': return [html()]; case 'css': return [css()];
    case 'scss': case 'sass': return [sass()]; case 'json': return [json()];
    case 'rs': return [rust()]; case 'cpp': case 'h': case 'hpp': case 'cc': return [cpp()];
    case 'java': return [java()]; case 'php': return [php()]; case 'sql': return [sql()];
    case 'xml': case 'svg': return [xml()]; case 'yaml': case 'yml': return [yaml()];
    case 'md': return [markdown()]; default: return [];
  }
};
