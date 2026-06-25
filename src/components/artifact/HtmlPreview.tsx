import { useMemo, useRef, useState, useCallback } from 'react';

interface HtmlPreviewProps {
  content: string;
  onError?: (error: string) => void;
}

const CSP_META = `
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
  style-src 'unsafe-inline' https://cdnjs.cloudflare.com;
  img-src data: blob:;
  font-src data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'none';
  form-action 'none';
">
`;

function buildSrcdoc(html: string): string {
  const cleaned = html.trim();

  if (cleaned.startsWith('<!DOCTYPE') || cleaned.startsWith('<html') || cleaned.startsWith('<head') || cleaned.startsWith('<body')) {
    return cleaned.replace('<head>', `<head>${CSP_META}`);
  }

  return `<!DOCTYPE html><html><head>${CSP_META}</head><body>${cleaned}</body></html>`;
}

export function HtmlPreview({ content, onError }: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);

  const build = useMemo(() => {
    try {
      return { srcdoc: buildSrcdoc(content), error: null as string | null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to build HTML';
      if (onError) onError(msg);
      return { srcdoc: '', error: msg };
    }
  }, [content, onError]);

  const handleLoad = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (iframe?.contentDocument) {
        const hasErrors = iframe.contentDocument.querySelector('script[error]');
        if (hasErrors) {
          setIframeError('Script execution error in preview');
        }
      }
    } catch {
      // Cross-origin errors are expected in strict sandbox; ignore
    }
  }, []);

  const displayError = build.error || iframeError;

  if (displayError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Preview Error</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{displayError}</p>
          <button
            onClick={() => onError?.(displayError)}
            className="mt-3 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Fix with Claude
          </button>
        </div>
        <details className="mt-4">
          <summary className="text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300">Show source code</summary>
          <pre className="mt-2 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 dark:text-neutral-300">
            {content}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-white dark:bg-transparent">
        <iframe
          ref={iframeRef}
          srcDoc={build.srcdoc}
          onLoad={handleLoad}
          sandbox="allow-scripts allow-same-origin"
          title="HTML Preview"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
