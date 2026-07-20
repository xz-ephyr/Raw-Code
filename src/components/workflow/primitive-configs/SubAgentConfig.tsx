interface SubAgentConfigProps {
  config: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}

const AGENT_TYPES = ['default', 'teamwork'] as const;

export default function SubAgentConfig({ config, onChange }: SubAgentConfigProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agent Type</label>
        <select
          value={(config.agentType as string) ?? 'default'}
          onChange={(e) => onChange({ agentType: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {AGENT_TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Task Description</label>
        <textarea
          value={(config.task as string) ?? ''}
          onChange={(e) => onChange({ task: e.target.value })}
          placeholder="Describe what this agent should do..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Max Steps</label>
        <input
          type="number"
          value={(config.maxSteps as number) ?? 10}
          onChange={(e) => onChange({ maxSteps: parseInt(e.target.value) || 10 })}
          min={1}
          max={50}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
