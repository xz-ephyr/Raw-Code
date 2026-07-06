import { TreePalmIcon, Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

interface WikiEmptyStateProps {
  onCreateClick: () => void;
}

export function WikiEmptyState({ onCreateClick }: WikiEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-foreground mb-5 border border-border">
        <HugeiconRenderer icon={TreePalmIcon} size={28} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5">
        No documents yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
        Create your first document to start building your knowledge base.
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className="mt-6 px-5 py-2 bg-accent text-accent-foreground text-sm font-semibold rounded-[8px] transition-all hover:bg-accent/80 cursor-pointer active:scale-[0.99] select-none flex items-center gap-2"
      >
        <HugeiconRenderer icon={Add01Icon} size={16} />
        New document
      </button>
    </div>
  );
}
