import type { FileItem } from '@/types/file-panel';

interface HistoryTabProps {
  file: FileItem;
  onRollback: (identifier: string, version: number) => void;
}

export function HistoryTab({ file, onRollback }: HistoryTabProps) {
  const versions = file.versions || [];

  if (versions.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center">
        <div className="text-sm text-muted-foreground py-8">No version history yet</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Version History
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">v{file.version}</span>
          <span className="text-xs text-muted-foreground">current</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatTime(file.createdAt)}
        </span>
      </div>

      {[...versions].reverse().map((version) => (
        <div
          key={version.version}
          className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted hover:bg-muted/50 border border-transparent hover:border-border transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">v{version.version}</span>
          </div>
          <div className="flex items-center gap-3">
<span className="text-xs text-muted-foreground">
              {formatTime(version.createdAt)}
            </span>
            <button
              onClick={() => onRollback(file.identifier, version.version)}
              className="px-2.5 py-1 text-xs font-medium text-foreground bg-accent rounded-md hover:bg-muted-foreground transition-colors"
            >
              Restore
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
