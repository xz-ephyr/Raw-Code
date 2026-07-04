import { Link } from 'react-router-dom';
import { Search01Icon, Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

interface ChatsEmptyStateProps {
  searchQuery: string;
  filter: 'active' | 'archived';
}

export function ChatsEmptyState({ searchQuery, filter }: ChatsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center text-neutral-200 mb-6 border border-neutral-800 shadow-sm">
        <HugeiconRenderer icon={searchQuery ? Search01Icon : Folder01Icon} size={36} />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {searchQuery
          ? 'No matches found'
          : filter === 'archived'
            ? 'No archived conversations'
            : 'Your chat list is empty'}
      </h3>
      <p className="text-sm text-neutral-500 max-w-[320px] leading-relaxed">
        {searchQuery
          ? `We couldn't find any results for "${searchQuery}". Try a different search term.`
          : 'Every conversation you start will appear here for easy access and organization.'}
      </p>
      {!searchQuery && filter === 'active' && (
        <Link
          to="/thread/new"
          className="mt-8 px-6 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-full hover:bg-neutral-800 transition-all hover:shadow-lg active:scale-95"
        >
          Start a new thread
        </Link>
      )}
    </div>
  );
}
