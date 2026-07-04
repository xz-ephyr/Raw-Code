import type { Artifact } from '@/types/artifact';

interface HistoryTabProps {
  artifact: Artifact;
  onRollback: (identifier: string, version: number) => void;
}

export function HistoryTab({ artifact, onRollback }: HistoryTabProps) {
  const versions = artifact.versions || [];

  if (versions.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center">
        <div className="text-sm text-neutral-400 text-neutral-500 py-8">No version history yet</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="text-xs font-medium text-neutral-400 text-neutral-500 uppercase tracking-wider mb-3">
        Version History
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-neutral-800 bg-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-200 text-neutral-200">v{artifact.version}</span>
          <span className="text-xs text-neutral-400 text-neutral-400">current</span>
        </div>
        <span className="text-xs text-neutral-400 text-neutral-500">
          {formatTime(artifact.createdAt)}
        </span>
      </div>

      {[...versions].reverse().map((version) => (
        <div
          key={version.version}
          className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-neutral-800 hover:bg-neutral-800/50 border border-transparent hover:border-neutral-700 hover:border-neutral-700 transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-400 text-neutral-400">v{version.version}</span>
          </div>
          <div className="flex items-center gap-3">
<span className="text-xs text-neutral-400 text-neutral-500">
              {formatTime(version.createdAt)}
            </span>
            <button
              onClick={() => onRollback(artifact.identifier, version.version)}
              className="px-2.5 py-1 text-xs font-medium text-neutral-400 text-neutral-300 bg-neutral-800 bg-neutral-700 rounded-md hover:bg-neutral-200 hover:bg-neutral-600 transition-colors"
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
