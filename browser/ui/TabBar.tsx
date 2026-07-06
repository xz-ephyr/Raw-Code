import { useCallback } from 'react';
import { useBrowser } from '../core/browserStore';

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  );
}

export function TabBar() {
  const { state, dispatch } = useBrowser();
  const { tabs, activeTabId } = state;

  const handleTabClick = useCallback((id: string) => dispatch({ type: 'SWITCH_TAB', id }), [dispatch]);
  const handleCloseTab = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_TAB', id });
  }, [dispatch]);
  const handleAddTab = useCallback(() => dispatch({ type: 'ADD_TAB', url: 'about:blank' }), [dispatch]);

  if (tabs.length === 0) {
    return (
      <div className="flex items-center bg-gray-800 border-b border-gray-700 px-2 py-1.5 gap-1">
        <button onClick={handleAddTab} className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <PlusIcon />
          <span>New Tab</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto">
      <div className="flex flex-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={`group flex items-center gap-1.5 min-w-0 max-w-[200px] px-3 py-1.5 text-sm border-r border-gray-700 transition-colors ${isActive ? 'bg-gray-700 text-white border-b-2 border-b-blue-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}>
              {tab.favicon ? <img src={tab.favicon} alt="" className="w-4 h-4 shrink-0" /> : <span className="shrink-0 text-gray-500"><GlobeIcon /></span>}
              <span className="truncate text-xs">{tab.title}</span>
              <span onClick={(e) => handleCloseTab(e, tab.id)} className={`ml-auto shrink-0 p-0.5 rounded transition-colors ${isActive ? 'hover:bg-gray-600' : 'opacity-0 group-hover:opacity-100 hover:bg-gray-600'}`} role="button" tabIndex={-1}><CloseIcon /></span>
            </button>
          );
        })}
      </div>
      <button onClick={handleAddTab} className="shrink-0 p-2 mx-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="New Tab"><PlusIcon /></button>
    </div>
  );
}
