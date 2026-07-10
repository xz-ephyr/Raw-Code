import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ResourcesAddIcon, GlobeIcon, HandBag01Icon } from '@hugeicons/core-free-icons';
import { ConnectorCard } from './ConnectorCard';
import { ConnectorDetailModal } from './ConnectorDetailModal';

const TABS = [
  { id: 'connectors', label: 'Connectors', icon: ResourcesAddIcon },
  { id: 'mcp', label: 'MCP', icon: GlobeIcon },
  { id: 'skills', label: 'Skills', icon: HandBag01Icon },
];

const TAB_CONTENT: Record<string, { title: string; description: string; items: { name: string; description: string; icon?: any; imageSrc?: string; stars?: number; details: string[]; connectorId?: string }[] }> = {
  connectors: {
    title: 'Connectors',
    description: 'Connect your AI to external services and data sources.',
    items: [
      { name: 'Gmail', description: 'Read, send, and manage your emails with AI assistance.', imageSrc: '/gmail.svg', details: ['Read inbox messages', 'Search emails by query', 'Send emails on your behalf', 'Manage labels and folders', 'Thread conversation support', 'Attachment handling'], connectorId: 'gmail' },
      { name: 'GitHub', description: 'Access repositories, issues, and pull requests.', imageSrc: '/github.svg', imageSrcDark: '/github-dark.svg', details: ['Repository access', 'Issue management', 'PR reviews', 'Code search'] },
      { name: 'Notion', description: 'Read and write Notion documents and databases.', imageSrc: '/notion.svg', details: ['Page editing', 'Database queries', 'Block manipulation', 'Search'] },
      { name: 'Jira', description: 'Manage tickets, sprints, and project boards.', imageSrc: '/jira.svg', details: ['Ticket CRUD', 'Sprint planning', 'Board views', 'Custom fields'] },
      { name: 'Slack', description: 'Send and receive messages in Slack channels.', imageSrc: '/slack.svg', details: ['Real-time message sync', 'Channel management', 'Thread support', 'File sharing'] },
      { name: 'Twitter', description: 'Post tweets and read timelines with AI.', imageSrc: '/twitter.svg', details: ['Post tweets', 'Read timelines', 'Search tweets', 'Manage threads'] },
      { name: 'YouTube', description: 'Search videos and manage playlists.', imageSrc: '/youtube.svg', details: ['Video search', 'Playlist management', 'Comment handling', 'Channel analytics'] },
      { name: 'WhatsApp', description: 'Send and receive WhatsApp messages.', imageSrc: '/whatsapp.svg', details: ['Send messages', 'Media sharing', 'Group management', 'Chat history'] },
      { name: 'Telegram', description: 'Send messages and manage Telegram chats.', imageSrc: '/telegram.svg', details: ['Send messages', 'Channel posting', 'Bot integration', 'Media sharing'] },
      { name: 'Reddit', description: 'Read and post to Reddit communities.', imageSrc: '/reddit.svg', details: ['Read subreddits', 'Post content', 'Comment management', 'Search posts'] },
    ],
  },
  mcp: {
    title: 'Model Context Protocol',
    description: 'MCP servers provide tools, resources, and context to the AI model.',
    items: [
      { name: 'Filesystem MCP', description: 'Read and write local files securely.', icon: GlobeIcon, stars: 5, details: ['File read/write', 'Directory listing', 'Path validation', 'Sandboxed access'] },
      { name: 'Database MCP', description: 'Query SQL databases with natural language.', icon: GlobeIcon, stars: 4, details: ['SQL execution', 'Schema inspection', 'Query optimization', 'Multiple engines'] },
      { name: 'Web Fetch MCP', description: 'Retrieve and parse web content.', icon: GlobeIcon, stars: 4, details: ['URL fetching', 'HTML parsing', 'Content extraction', 'Caching'] },
      { name: 'Custom MCP', description: 'Build your own MCP server.', icon: GlobeIcon, stars: 3, details: ['JSON-RPC protocol', 'Tool definition', 'Resource exposure', 'Stdio/SSE transport'] },
    ],
  },
  skills: {
    title: 'Skills',
    description: 'Installable skills that add specialized capabilities to your AI.',
    items: [
      { name: 'Web Search', description: 'Real-time information retrieval from the web.', icon: HandBag01Icon, stars: 5, details: ['Google/Bing search', 'News aggregation', 'Result ranking', 'Snippet extraction'] },
      { name: 'Code Analysis', description: 'Review, debug, and suggest improvements to code.', icon: HandBag01Icon, stars: 4, details: ['Bug detection', 'Style checking', 'Complexity analysis', 'Refactoring hints'] },
      { name: 'Image Generation', description: 'Create visuals from text prompts.', icon: HandBag01Icon, stars: 4, details: ['DALL-E integration', 'Style control', 'Resolution options', 'Batch generation'] },
      { name: 'Data Analysis', description: 'Process and visualize datasets.', icon: HandBag01Icon, stars: 3, details: ['CSV/JSON parsing', 'Chart generation', 'Statistical summary', 'Export formats'] },
    ],
  },
};

export const PluginTabs = () => {
  const [activeTab, setActiveTab] = useState('connectors');
  const [selectedItem, setSelectedItem] = useState<{ name: string; description: string; icon?: any; imageSrc?: string; stars?: number; details: string[]; connectorId?: string } | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const content = TAB_CONTENT[activeTab];
  const tabType = activeTab === 'connectors' ? 'connector' : activeTab === 'mcp' ? 'mcp' : 'skill' as const;

  useEffect(() => {
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const res = await fetch('http://localhost:3001/gmail/status', { method: 'POST' });
      const data = await res.json();
      setGmailConnected(data.connected);
    } catch {}
  };

  const startGmailOAuth = async (clientId: string) => {
    try {
      const res = await fetch('http://localhost:3001/gmail/auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Failed to get auth URL:', err);
        return;
      }

      const { url } = await res.json();
      const popup = window.open(url, 'gmail-oauth', 'width=500,height=600');

      const poll = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(poll);
          checkGmailStatus();
        }
      }, 1000);
    } catch (err) {
      console.error('Gmail connect error:', err);
    }
  };

  const handleConnectorAction = async (item: typeof selectedItem) => {
    if (item?.connectorId === 'gmail') {
      if (gmailConnected) return;

      const { DatabaseService } = await import('@core/utils/DatabaseService');
      const clientId = await DatabaseService.getConfig('gmail-client-id');

      if (clientId) {
        startGmailOAuth(clientId);
      }
      // If no clientId, the modal will show the slide-out setup panel
    }
  };

  const handleGmailClientIdSubmit = async (clientId: string) => {
    const { DatabaseService } = await import('@core/utils/DatabaseService');
    await DatabaseService.setConfig('gmail-client-id', clientId);
    startGmailOAuth(clientId);
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex gap-0.5 border border-border rounded-lg p-0.5 w-fit">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <HugeiconsIcon icon={tab.icon} size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>
        <p className="text-sm text-muted-foreground">{content.description}</p>
      </div>
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
        {content.items.map((item, i) => (
          <ConnectorCard
            key={i}
            label={item.name}
            description={item.description}
            icon={item.icon}
            imageSrc={item.imageSrc}
            imageSrcDark={(item as any).imageSrcDark}
            type={tabType}
            stars={item.stars}
            connected={item.connectorId === 'gmail' ? gmailConnected : undefined}
            onClick={() => setSelectedItem(item)}
            onAction={() => handleConnectorAction(item)}
          />
        ))}
      </div>

      {selectedItem && (
        <ConnectorDetailModal
          label={selectedItem.name}
          description={selectedItem.description}
          icon={selectedItem.icon!}
          imageSrc={selectedItem.imageSrc}
          type={tabType}
          stars={selectedItem.stars}
          details={selectedItem.details}
          isOpen={!!selectedItem}
          connected={selectedItem.connectorId === 'gmail' ? gmailConnected : undefined}
          onClose={() => setSelectedItem(null)}
          onAction={() => handleConnectorAction(selectedItem)}
          onClientIdSubmit={selectedItem.connectorId === 'gmail' ? handleGmailClientIdSubmit : undefined}
        />
      )}
    </div>
  );
};
