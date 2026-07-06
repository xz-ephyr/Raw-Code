import { useState, useCallback } from 'react';
import { useBrowser } from '../core/browserStore';
import { searchOrNavigate } from '../core/useNavigation';

export function NewTabPage() {
  const { dispatch } = useBrowser();
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    dispatch({ type: 'NAVIGATE', url: searchOrNavigate(query) });
  }, [query, dispatch]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-6 px-4">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <h1 className="text-3xl font-bold text-gray-100">Mini Browser</h1>
      <p className="text-sm text-gray-500">Search or enter a URL to start browsing</p>
      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search or enter URL..." className="w-full rounded-lg bg-gray-800 border border-gray-700 px-5 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </form>
    </div>
  );
}
