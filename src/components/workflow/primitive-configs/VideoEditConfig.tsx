interface VideoEditConfigProps {
  config: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}

export default function VideoEditConfig({ config, onChange }: VideoEditConfigProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Google Drive File ID</label>
        <input
          type="text"
          value={(config.sourceFileId as string) ?? ''}
          onChange={(e) => onChange({ sourceFileId: e.target.value })}
          placeholder="e.g. 1abc123..."
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">GitHub Repo (owner/repo)</label>
        <input
          type="text"
          value={(config.repo as string) ?? ''}
          onChange={(e) => onChange({ repo: e.target.value })}
          placeholder="e.g. my-user/video-pipeline"
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Edit Manifest (JSON)</label>
        <textarea
          value={(config.manifest as string) ?? ''}
          onChange={(e) => onChange({ manifest: e.target.value })}
          placeholder='{"version":1,"output":{"filename":"out.mp4"},"operations":[]}'
          rows={6}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Callback URL (optional)</label>
        <input
          type="text"
          value={(config.callbackUrl as string) ?? ''}
          onChange={(e) => onChange({ callbackUrl: e.target.value })}
          placeholder="https://example.com/callback"
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
