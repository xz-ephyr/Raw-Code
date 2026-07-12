import { PluginTabs } from '../components/plugins/PluginTabs';

export const PluginsPage = () => {
  return (
    <div className="flex-1 bg-background overflow-y-auto thin-scrollbar">
      <div className="mx-auto px-6 py-8" style={{ maxWidth: 'min(1200px, 100%)' }}>
        {/* Header with large text */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">Plugins</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Extend your AI with connectors, MCP servers, and installable skills.
          </p>
        </div>

        <PluginTabs />
      </div>
    </div>
  );
};