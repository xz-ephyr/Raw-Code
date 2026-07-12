import { PasswordInput } from '@/components/ui/PasswordInput';
import { useSettingsConfig } from '@/hooks/useSettingsConfig';

export function WebSearchTab() {
  const { config: searchConfig, setConfig: setSearchConfig, loaded: searchKeysLoaded, isSaving, save: handleSave } = useSettingsConfig([
    'search-provider', 'search-api-key', 'search-exa-api-key', 'search-firecrawl-api-key',
  ]);

  if (!searchKeysLoaded) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800">
        <p className="text-xs text-blue-400 leading-relaxed">
          Configure web search providers. API keys are stored securely in the local database.
          At minimum, set a <strong>Search Provider</strong> (Tavily recommended) for web search.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Search Provider</label>
        <select
          className="h-10 bg-muted rounded-[10px] px-3 text-sm outline-none w-full border border-border focus:border-ring transition-all appearance-none cursor-pointer"
          value={searchConfig['search-provider'] || 'tavily'}
          onChange={(e) => setSearchConfig(p => ({ ...p, 'search-provider': e.target.value }))}
        >
          <option value="tavily">Tavily (Recommended)</option>
          <option value="exa">Exa</option>
          <option value="firecrawl">Firecrawl</option>

        </select>
        <p className="text-xs text-muted-foreground">Provider used for general web search.</p>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <SearchKeyField
          label="Tavily API Key"
          hint="Get a free key at tavily.com"
          value={searchConfig['search-api-key'] || ''}
          onChange={(v) => setSearchConfig(p => ({ ...p, 'search-api-key': v }))}
        />

        <SearchKeyField
          label="Exa API Key"
          hint="1,000 free queries/mo at exa.ai. Used for news search (falls back to Tavily)."
          subtitle="for news search"
          value={searchConfig['search-exa-api-key'] || ''}
          onChange={(v) => setSearchConfig(p => ({ ...p, 'search-exa-api-key': v }))}
        />

        <SearchKeyField
          label="Firecrawl API Key"
          hint="Best for fetching full page content. Get a key at firecrawl.dev"
          subtitle="for page scraping"
          value={searchConfig['search-firecrawl-api-key'] || ''}
          onChange={(v) => setSearchConfig(p => ({ ...p, 'search-firecrawl-api-key': v }))}
        />


      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-4 px-6 py-2 text-sm font-bold text-accent-foreground bg-accent hover:bg-muted rounded-[10px] transition-all flex items-center gap-2 shadow-lg shadow-black/30 active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : null}
          Save Search Settings
        </button>
      </div>
    </div>
  );
}

function SearchKeyField({ label, subtitle, hint, value, onChange }: {
  label: string;
  subtitle?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
<label className="text-[12px] font-medium text-muted-foreground ml-1">
        {label} {subtitle && <span className="text-muted-foreground">({subtitle})</span>}
      </label>
      <PasswordInput
        value={value}
        onChange={onChange}
        placeholder={value ? '••••••••••••••••' : `Enter ${label}`}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
