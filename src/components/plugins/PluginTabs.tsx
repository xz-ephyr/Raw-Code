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
                ? 'bg-[#111110] text-neutral-100 border border-neutral-700 border-b-[#111110] -mb-px'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-300 border border-transparent'
            }`}
          >
            <HugeiconsIcon icon={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="border border-neutral-700 rounded-b-lg rounded-tr-lg bg-[#111110] p-6">
        <h3 className="text-lg font-semibold text-neutral-100">{content.title}</h3>
        <p className="mt-1 text-sm text-neutral-400">{content.description}</p>
        <ul className="mt-4 space-y-2">
          {content.items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
