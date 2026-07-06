import { useState, useRef, useEffect, useCallback } from 'react';
import { useBrowser } from '../core/browserStore';
import { searchOrNavigate } from '../core/useNavigation';

export function NavigationBar() {
  const { state, dispatch } = useBrowser();
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab) {
      setUrlInput(activeTab.url === 'about:blank' ? '' : activeTab.url);
    }
  }, [activeTab?.url, activeTab?.id]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;
    dispatch({ type: 'NAVIGATE', url: searchOrNavigate(raw) });
    inputRef.current?.blur();
  }, [urlInput, dispatch]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700">
      <button onClick={() => dispatch({ type: 'GO_BACK' })} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300" title="Back">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button onClick={() => dispatch({ type: 'GO_FORWARD' })} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300" title="Forward">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      <button onClick={() => dispatch({ type: 'NAVIGATE', url: activeTab?.url || 'about:blank' })} className="p-1.5 rounded hover:bg-gray-700 text-gray-300" title="Refresh">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
      </button>
      <form onSubmit={handleSubmit} className="flex-1">
        <input ref={inputRef} type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Search or enter URL..." className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </form>
    </div>
  );
}
