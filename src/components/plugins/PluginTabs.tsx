import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ResourcesAddIcon, GlobeIcon, HandBag01Icon } from '@hugeicons/core-free-icons';

const TABS = [
  { id: 'connectors', label: 'Connectors', icon: ResourcesAddIcon },
  { id: 'mcp', label: 'MCP', icon: GlobeIcon },
  { id: 'skills', label: 'Skills', icon: HandBag01Icon },
];

const TAB_CONTENT: Record<string, { title: string; description: string; items: string[] }> = {
  connectors: {
    title: 'Connectors',
    description: 'Connect your AI to external services and data sources.',
    items: [
      'Slack integration — send and receive messages',
      'GitHub connector — access repositories and issues',
      'Notion sync — read and write documents',
      'Jira bridge — manage tickets and sprints',
    ],
  },
  mcp: {
    title: 'Model Context Protocol',
    description: 'MCP servers provide tools, resources, and context to the AI model.',
    items: [
      'Filesystem MCP — read and write local files',
      'Database MCP — query SQL databases',
      'Web fetch MCP — retrieve web content',
      'Custom MCP — bring your own server',
    ],
  },
  skills: {
    title: 'Skills',
    description: 'Installable skills that add specialized capabilities to your AI.',
    items: [
      'Web search skill — real-time information retrieval',
      'Code analysis skill — review and debug code',
      'Image generation skill — create visuals from prompts',
      'Data analysis skill — process and visualize data',
    ],
  },
};

export const PluginTabs = () => {
  const [activeTab, setActiveTab] = useState('connectors');
  const content = TAB_CONTENT[activeTab];

  return (
    <div>
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === tab.id
                ? 'bg-card text-foreground border border-border border-b-card -mb-px'
                : 'bg-muted text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            <HugeiconsIcon icon={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="border border-border rounded-b-lg rounded-tr-lg bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{content.description}</p>
        <ul className="mt-4 space-y-2">
          {content.items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
