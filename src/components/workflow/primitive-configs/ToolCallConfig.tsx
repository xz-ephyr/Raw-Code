interface ToolCallConfigProps {
  config: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}

export default function ToolCallConfig({ config, onChange }: ToolCallConfigProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tool Name</label>
        <input
          type="text"
          value={(config.toolName as string) ?? ''}
          onChange={(e) => onChange({ toolName: e.target.value })}
          placeholder="e.g. web_search, write_article"
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Input Parameters (JSON)</label>
        <textarea
          value={(config.input as string) ?? ''}
          onChange={(e) => onChange({ input: e.target.value })}
          placeholder='{"query": "example"}'
          rows={3}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
        />
      </div>
    </div>
  );
}
