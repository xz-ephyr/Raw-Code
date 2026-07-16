import { useRef, useState, useCallback, useEffect } from 'react';

interface ReactPreviewProps {
  content: string;
  onError?: (error: string) => void;
}

function normalizeCode(code: string): string {
  let normalized = code.trim();

  if (normalized.includes('export default')) {
    normalized = normalized.replace(/export\s+default\s+/g, '');
  }

  normalized = normalized
    .replace(/import\s+(\w+)\s+from\s+["']react["']/g, 'var $1 = window.React;')
    .replace(/import\s+\{\s*(\w+(?:\s*,\s*\w+)*)\s*\}\s+from\s+["']react["']/g, (_, imports) => {
      return imports.split(',').map((i: string) => `var ${i.trim()} = window.React;`).join('\n');
    })
    .replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+["']lucide-react["']/g, (_, imports) => {
      return imports.split(',').map((i: string) => {
        const name = i.trim();
        return `var ${name} = window.lucideReact && window.lucideReact.${name};`;
      }).join('\n');
    })
    .replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+["']recharts["']/g, (_, imports) => {
      return imports.split(',').map((i: string) => {
        const name = i.trim();
        return `var ${name} = window.recharts && window.recharts.${name};`;
      }).join('\n');
    });

  return normalized;
}

async function transpile(code: string): Promise<string> {
  try {
    // @ts-expect-error - @babel/standalone has no types
    const Babel = await import('@babel/standalone');
    const result = Babel.transform(code, {
      presets: ['react', ['typescript', { ignoreExtensions: true }]],
      filename: 'file.tsx',
      compact: false,
      retainLines: true,
    });
    return result.code || code;
  } catch (e) {
    throw new Error(`Transpilation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

function buildSrcdoc(transpiledCode: string): string {
  const escapedCode = transpiledCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://unpkg.com;
  style-src 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
  img-src data: blob:;
  font-src data: https://fonts.gstatic.com;
  connect-src 'self';
  object-src 'none';
  base-uri 'none';
  form-action 'none';
">
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.min.js"></script>
<script src="https://unpkg.com/recharts@2.12.0/umd/Recharts.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #2a2a2a; color: #d4d4d4; }
  #root { min-height: 100vh; }
  .error-card {
    padding: 20px; margin: 16px; border-radius: 8px;
    border: 1px solid #7f1d1d; background: #2a2a2a;
  }
  .error-card p { color: #fca5a5; font-size: 14px; margin-bottom: 12px; }
  .error-card .error-message {
    font-family: monospace; font-size: 12px;
    color: #fca5a5; background: #2a2a2a;
    padding: 8px; border-radius: 4px;
    white-space: pre-wrap; word-break: break-word;
  }
</style>
</head>
<body>
<div id="root"></div>
<script>
  window.__FILE_ERROR__ = null;
  window.addEventListener('error', function(e) {
    window.__FILE_ERROR__ = e.message || 'Unknown error';
    renderError(window.__FILE_ERROR__);
    e.preventDefault();
  });

  function renderError(msg) {
    var root = document.getElementById('root');
    if (root) {
      root.innerHTML = '<div class="error-card"><p>Failed to render component</p><div class="error-message">' +
        msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') +
        '</div></div>';
      window.parent && window.parent.postMessage({ type: 'FILE_ERROR', error: msg }, '*');
    }
  }

  try {
    window.React = React;
    if (typeof lucideReact !== 'undefined') {
      window.lucideReact = lucideReact;
    }
    if (typeof Recharts !== 'undefined') {
      window.recharts = Recharts;
    }

    ${escapedCode}

    var Component = null;
    if (typeof App !== 'undefined') Component = App;
    else if (typeof default_export !== 'undefined') Component = default_export;
    else {
      var keys = Object.keys(window).filter(function(k) {
        return typeof window[k] === 'function' && k !== 'React' && k !== 'ReactDOM' &&
          k !== 'lucideReact' && k !== 'recharts' && k !== 'Recharts' &&
          !k.startsWith('__') && !k.startsWith('webkit');
      });
      if (keys.length > 0) Component = window[keys[0]];
    }

    if (Component) {
      var root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(Component));
    } else {
      renderError('No component found. Make sure your code has a default export or defines a function/class component.');
    }
  } catch (e) {
    renderError(e.message || 'Unknown error');
  }
</script>
</body>
</html>`;
}

export function ReactPreview({ content, onError }: ReactPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);

  const [srcdoc, setSrcdoc] = useState('');
  const [buildError, setBuildError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const normalized = normalizeCode(content);
        const transpiled = await transpile(normalized);
        if (!cancelled) {
          setSrcdoc(buildSrcdoc(transpiled));
          setBuildError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          onError?.(msg);
          setBuildError(msg);
          setSrcdoc('');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [content, onError]);

  const error = buildError || iframeError;

  const handleMessage = useCallback((e: MessageEvent) => {
    if (e.data?.type === 'FILE_ERROR') {
      setIframeError(e.data.error);
      onError?.(e.data.error);
    }
  }, [onError]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleRetry = useCallback(async () => {
    setIframeError(null);
    setBuildError(null);
    try {
      const normalized = normalizeCode(content);
      const transpiled = await transpile(normalized);
      setSrcdoc(buildSrcdoc(transpiled));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setIframeError(msg);
      onError?.(msg);
    }
  }, [content, onError]);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-900/20 border border-red-800 p-4">
          <p className="text-sm font-medium text-red-300">Failed to render React component</p>
          <pre className="mt-2 text-xs text-red-400 whitespace-pre-wrap font-mono">{error}</pre>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 text-xs font-medium bg-red-800 text-red-300 rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => onError?.(error)}
              className="px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-md hover:bg-accent transition-colors"
            >
              Fix with Claude
            </button>
          </div>
        </div>
        <details className="mt-4">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Show source code</summary>
          <pre className="mt-2 p-4 bg-muted rounded-lg border border-border text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 text-foreground">
            {content}
          </pre>
        </details>
      </div>
    );
  }

  if (!srcdoc) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-sm text-muted-foreground py-8">Preparing preview...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-background">
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          sandbox="allow-scripts allow-same-origin"
          title="React Preview"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
