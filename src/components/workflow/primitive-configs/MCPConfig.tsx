interface MCPConfigProps {
  config: Record<string, unknown>;
  onChange: (partial: Record<string, unknown>) => void;
}

export default function MCPConfig({ config, onChange }: MCPConfigProps) {
  return (
    <div className="space-y-3">
      <div className="px-3 py-2 bg-muted border border-border rounded-lg">
        <p className="text-xs text-muted-foreground">
          MCP (Model Context Protocol) integration is coming soon.
          You will be able to connect external MCP servers and use their tools.
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Server URL</label>
        <input
          type="text"
          value={(config.serverUrl as string) ?? ''}
          onChange={(e) => onChange({ serverUrl: e.target.value })}
          placeholder="e.g. http://localhost:8080/mcp"
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring opacity-60"
          disabled
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tool Name</label>
        <input
          type="text"
          value={(config.mcpTool as string) ?? ''}
          onChange={(e) => onChange({ mcpTool: e.target.value })}
          placeholder="MCP tool name"
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring opacity-60"
          disabled
        />
      </div>
    </div>
  );
}
