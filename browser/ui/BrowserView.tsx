import { useRef, useCallback, useEffect } from 'react';
import { useBrowser } from '../core/browserStore';
import { NewTabPage } from './NewTabPage';

export function BrowserView() {
  const { state, dispatch } = useBrowser();
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!activeTab || !iframeRef.current) return;
    if (activeTab.url === 'about:blank' || !activeTab.url) return;
    iframeRef.current.src = activeTab.url;
  }, [activeTab?.url, activeTab?.id]);

  const handleLoad = useCallback(() => {
    if (!activeTab || !iframeRef.current) return;
    try {
      const title = iframeRef.current.contentDocument?.title || activeTab.url;
      dispatch({ type: 'UPDATE_TAB', id: activeTab.id, isLoading: false, title });
    } catch {
      dispatch({ type: 'UPDATE_TAB', id: activeTab.id, isLoading: false });
    }
  }, [activeTab, dispatch]);

  const showNewTab = !activeTab?.url || activeTab.url === 'about:blank';

  return (
    <div className="relative flex-1 h-full">
      {showNewTab ? (
        <NewTabPage />
      ) : (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation allow-downloads"
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          title={activeTab?.title || 'Browser'}
        />
      )}
    </div>
  );
}
