import { useState, useRef, useEffect } from 'react';
import { Search01Icon, FilterMailIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

interface ChatSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: 'active' | 'archived';
  onFilterChange: (filter: 'active' | 'archived') => void;
}

export function ChatSearchBar({ searchQuery, onSearchChange, filter, onFilterChange }: ChatSearchBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterMenuPos, setFilterMenuPos] = useState<{ top: number; left: number } | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setFilterMenuPos(null);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  const openFilter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterMenuPos({ top: rect.bottom + 8, left: rect.right - 208 });
    setIsFilterOpen(!isFilterOpen);
  };

  const selectFilter = (value: 'active' | 'archived') => {
    onFilterChange(value);
    setIsFilterOpen(false);
    setFilterMenuPos(null);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <HugeiconRenderer icon={Search01Icon} size={20} />
        </div>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-muted rounded-[8px] py-3 pl-12 pr-4 text-sm focus:outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div ref={filterRef}>
        <button
          onClick={openFilter}
          className={cn(
            'p-3 rounded-2xl transition-all flex items-center justify-center h-[46px] w-[46px] bg-transparent text-muted-foreground active:scale-95 active:bg-muted',
            isFilterOpen && 'bg-muted text-foreground'
          )}
          aria-label="Filter chats"
        >
          <HugeiconRenderer icon={FilterMailIcon} size={20} />
        </button>

        {isFilterOpen && filterMenuPos && (
          <div
            className="fixed w-52 bg-card border border-border rounded-2xl shadow-xl shadow-black/30 py-2 z-[9999]"
            style={{ top: filterMenuPos.top, left: filterMenuPos.left }}
          >
            <div className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Filter by
            </div>
            <button
              onClick={() => selectFilter('active')}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span className={cn('font-medium', filter === 'active' ? 'text-foreground' : 'text-muted-foreground')}>
                Active Chats
              </span>
              {filter === 'active' && (
                <HugeiconRenderer icon={CheckmarkCircle02Icon} size={18} className="text-foreground" />
              )}
            </button>
            <button
              onClick={() => selectFilter('archived')}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span className={cn('font-medium', filter === 'archived' ? 'text-foreground' : 'text-muted-foreground')}>
                Archived Chats
              </span>
              {filter === 'archived' && (
                <HugeiconRenderer icon={CheckmarkCircle02Icon} size={18} className="text-foreground" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
