import React, { useMemo } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import { ArtifactType } from '../../hooks/useArtifacts';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { rust } from '@codemirror/lang-rust';

function sanitizeSvg(svgContent: string): string {
  return svgContent.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function injectHtmlSandbox(htmlContent: string): string {
  const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:;">';
  if (/<head/i.test(htmlContent)) {
    return htmlContent.replace(/<head/i, `<head>${csp}`);
  }
  if (/<html/i.test(htmlContent)) {
    return htmlContent.replace(/<html/i, `<html><head>${csp}</head>`);
  }
  return `<!DOCTYPE html><html><head>${csp}</head><body>${htmlContent}</body></html>`;
}

interface ArtifactRendererProps {
  type: ArtifactType;
  content: string;
  mode?: 'preview' | 'code';
}

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({
  type,
  content,
  mode = 'preview',
}) => {
  const safeContent = useMemo(() => {
    if (type === 'svg') return sanitizeSvg(content);
    if (type === 'html') return injectHtmlSandbox(content);
    return content;
  }, [type, content]);

  const getLanguage = (type: string) => {
    switch (type) {
      case 'react':
      case 'js':
        return [javascript({ jsx: true, typescript: true })];
      case 'html':
        return [html()];
      case 'css':
        return [css()];
      case 'json':
        return [json()];
      case 'python':
        return [python()];
      case 'rust':
        return [rust()];
      case 'markdown':
        return [markdown()];
      default:
        return [javascript({ jsx: true, typescript: true })];
    }
  };

  if (mode === 'code') {
    return (
      <div className="h-full overflow-auto">
        <CodeMirror
          value={content}
          height="100%"
          theme="light"
          extensions={getLanguage(type)}
          readOnly={true}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
        />
      </div>
    );
  }

  switch (type) {
    case 'react':
      return (
        <Sandpack
          template="react"
          files={{
            '/App.js': safeContent,
          }}
          options={{
            showNavigator: false,
            showTabs: false,
            editorHeight: '100%',
          }}
          theme="light"
        />
      );
    case 'html':
      return (
        <iframe
          srcDoc={safeContent}
          sandbox="allow-scripts"
          className="w-full h-full border-none bg-white"
          title="Artifact Preview"
        />
      );
    case 'markdown':
      return (
        <div className="p-8 prose prose-sm max-w-none h-full overflow-auto bg-white">
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      );
    case 'chart':
      // Simplified chart placeholder - in a real app we'd parse data and use Recharts
      return (
        <div className="flex items-center justify-center h-full bg-neutral-50 p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-600 mb-2">Chart View</p>
            <p className="text-xs text-neutral-400">Data visualization would render here.</p>
          </div>
        </div>
      );
    case 'sheet':
      return (
        <div className="h-full overflow-auto p-4 bg-white">
          <table className="min-w-full border-collapse border border-neutral-200 text-sm">
            <tbody>
              {content.split('\n').map((line, i) => (
                <tr key={i}>
                  {line.split(',').map((cell, j) => (
                    <td key={j} className="border border-neutral-200 px-3 py-1.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'slides':
      return (
        <div className="flex items-center justify-center h-full bg-neutral-800 text-white p-8">
          <div className="text-center max-w-xl">
            <h2 className="text-3xl font-bold mb-4">Slide Preview</h2>
            <div className="bg-neutral-700 aspect-video flex items-center justify-center p-4 rounded-lg">
              <p className="text-lg">{content.split('\n')[0] || 'Slide Content'}</p>
            </div>
          </div>
        </div>
      );
    case 'svg':
      return (
        <div
          className="w-full h-full flex items-center justify-center bg-white p-4 overflow-auto"
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      );
    default:
      return (
        <div className="p-4 h-full overflow-auto bg-white">
          <pre className="text-xs">{content}</pre>
        </div>
      );
  }
};
