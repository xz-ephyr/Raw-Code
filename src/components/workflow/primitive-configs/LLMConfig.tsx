interface LLMConfigProps {
  config: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}

export default function LLMConfig({ config, onChange }: LLMConfigProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Model</label>
        <input
          type="text"
          value={(config.model as string) ?? ''}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="e.g. gpt-4o, gemini-2.5-flash"
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">System Prompt</label>
        <textarea
          value={(config.systemPrompt as string) ?? ''}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="Optional system instructions for the model..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Temperature</label>
          <input
            type="number"
            value={(config.temperature as number) ?? 0.7}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) || 0.7 })}
            min={0}
            max={2}
            step={0.1}
            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Max Tokens</label>
          <input
            type="number"
            value={(config.maxTokens as number) ?? 4096}
            onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 4096 })}
            min={1}
            max={128000}
            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
