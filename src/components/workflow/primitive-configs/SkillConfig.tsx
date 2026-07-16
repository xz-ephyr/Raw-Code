interface SkillConfigProps {
  config: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}

export default function SkillConfig({ config, onChange }: SkillConfigProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Skill Name</label>
        <input
          type="text"
          value={(config.skillName as string) ?? ''}
          onChange={(e) => onChange({ skillName: e.target.value })}
          placeholder="e.g. web_search, code_analysis"
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Parameters (JSON)</label>
        <textarea
          value={(config.parameters as string) ?? ''}
          onChange={(e) => onChange({ parameters: e.target.value })}
          placeholder='{"enable": ["feature-a", "feature-b"]}'
          rows={3}
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
        />
      </div>
    </div>
  );
}
