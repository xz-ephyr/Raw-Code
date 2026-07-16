interface ConnectorConfigProps {
  config: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}

const CONNECTORS = ['gmail', 'github', 'youtube', 'telegram', 'reddit', 'twitter'] as const;

export default function ConnectorConfig({ config, onChange }: ConnectorConfigProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Connector</label>
        <select
          value={(config.connector as string) ?? ''}
          onChange={(e) => onChange({ connector: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a connector...</option>
          {CONNECTORS.map((c) => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Action</label>
        <input
          type="text"
          value={(config.action as string) ?? ''}
          onChange={(e) => onChange({ action: e.target.value })}
          placeholder="e.g. send_email, create_issue"
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Parameters (JSON)</label>
        <textarea
          value={(config.params as string) ?? ''}
          onChange={(e) => onChange({ params: e.target.value })}
          placeholder='{"to": "user@example.com", "subject": "Hello"}'
          rows={3}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
        />
      </div>
    </div>
  );
}
