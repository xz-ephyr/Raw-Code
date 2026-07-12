import { useState, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ResourcesAddIcon, GlobeIcon, HandBag01Icon } from '@hugeicons/core-free-icons';
import { ConnectorCard } from './ConnectorCard';
import { ConnectorDetailModal } from './ConnectorDetailModal';
import { useToast } from '../ui/Toast';
import { useAllConnectorsStatus } from '@/hooks/useConnectorStatus';

const TABS = [
  { id: 'connectors', label: 'Connectors', icon: ResourcesAddIcon },
  { id: 'mcp', label: 'MCP', icon: GlobeIcon },
  { id: 'skills', label: 'Skills', icon: HandBag01Icon },
];

interface ConnectorItem {
  name: string;
  description: string;
  imageSrc?: string;
  imageSrcDark?: string;
  icon?: any;
  stars?: number;
  details?: string[];
  connectorId?: string;
  authType?: 'oauth2' | 'token';
}

const CONNECTOR_AUTH_TYPES: Record<string, 'oauth2' | 'token'> = {
  gmail: 'oauth2',
  github: 'oauth2',
  youtube: 'oauth2',
  reddit: 'oauth2',
  twitter: 'oauth2',
  telegram: 'token',
};

const CONNECTOR_CATEGORIES: Record<string, { label: string; items: ConnectorItem[] }> = {
  integrations: {
    label: 'Integrations',
    items: [
      { name: 'Gmail', description: 'Read, send, and manage your emails with AI assistance.', imageSrc: '/gmail.svg', details: ['Read inbox messages', 'Search emails by query', 'Send emails on your behalf', 'Manage labels and folders', 'Thread conversation support', 'Attachment handling'], connectorId: 'gmail' },
      { name: 'GitHub', description: 'Access repositories, issues, and pull requests.', imageSrc: '/github.svg', imageSrcDark: '/github-dark.svg', details: ['Repository access', 'Issue management', 'PR reviews', 'Code search'], connectorId: 'github' },
      { name: 'Notion', description: 'Read and write Notion documents and databases.', imageSrc: '/notion.svg', details: ['Page editing', 'Database queries', 'Block manipulation', 'Search'] },
      { name: 'Jira', description: 'Manage tickets, sprints, and project boards.', imageSrc: '/jira.svg', details: ['Ticket CRUD', 'Sprint planning', 'Board views', 'Custom fields'] },
    ],
  },
  social: {
    label: 'Social',
    items: [
      { name: 'Slack', description: 'Send and receive messages in Slack channels.', imageSrc: '/slack.svg', details: ['Real-time message sync', 'Channel management', 'Thread support', 'File sharing'] },
      { name: 'Twitter', description: 'Post tweets and read timelines with AI.', imageSrc: '/twitter.svg', details: ['Post tweets', 'Read timelines', 'Search tweets', 'Manage threads'], connectorId: 'twitter' },
      { name: 'Telegram', description: 'Send messages and manage Telegram chats.', imageSrc: '/telegram.svg', details: ['Send messages', 'Channel posting', 'Bot integration', 'Media sharing'], connectorId: 'telegram' },
      { name: 'Reddit', description: 'Read and post to Reddit communities.', imageSrc: '/reddit.svg', details: ['Read subreddits', 'Post content', 'Comment management', 'Search posts'], connectorId: 'reddit' },
      { name: 'YouTube', description: 'Search videos and manage playlists.', imageSrc: '/youtube.svg', details: ['Video search', 'Playlist management', 'Comment handling', 'Channel analytics'], connectorId: 'youtube' },
    ],
  },
};

const TAB_CONTENT: Record<string, { title: string; description: string; items: ConnectorItem[] }> = {
  connectors: {
    title: 'Connectors',
    description: '',
    items: [
      { name: 'Gmail', description: 'Read, send, and manage your emails with AI assistance.', imageSrc: '/gmail.svg', details: ['Read inbox messages', 'Search emails by query', 'Send emails on your behalf', 'Manage labels and folders', 'Thread conversation support', 'Attachment handling'], connectorId: 'gmail' },
      { name: 'GitHub', description: 'Access repositories, issues, and pull requests.', imageSrc: '/github.svg', imageSrcDark: '/github-dark.svg', details: ['Repository access', 'Issue management', 'PR reviews', 'Code search'], connectorId: 'github' },
      { name: 'Notion', description: 'Read and write Notion documents and databases.', imageSrc: '/notion.svg', details: ['Page editing', 'Database queries', 'Block manipulation', 'Search'] },
      { name: 'Jira', description: 'Manage tickets, sprints, and project boards.', imageSrc: '/jira.svg', details: ['Ticket CRUD', 'Sprint planning', 'Board views', 'Custom fields'] },
      { name: 'Slack', description: 'Send and receive messages in Slack channels.', imageSrc: '/slack.svg', details: ['Real-time message sync', 'Channel management', 'Thread support', 'File sharing'] },
      { name: 'Twitter', description: 'Post tweets and read timelines with AI.', imageSrc: '/twitter.svg', details: ['Post tweets', 'Read timelines', 'Search tweets', 'Manage threads'], connectorId: 'twitter' },
      { name: 'YouTube', description: 'Search videos and manage playlists.', imageSrc: '/youtube.svg', details: ['Video search', 'Playlist management', 'Comment handling', 'Channel analytics'], connectorId: 'youtube' },
      { name: 'Telegram', description: 'Send messages and manage Telegram chats.', imageSrc: '/telegram.svg', details: ['Send messages', 'Channel posting', 'Bot integration', 'Media sharing'], connectorId: 'telegram' },
      { name: 'Reddit', description: 'Read and post to Reddit communities.', imageSrc: '/reddit.svg', details: ['Read subreddits', 'Post content', 'Comment management', 'Search posts'], connectorId: 'reddit' },
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
  const [selectedItem, setSelectedItem] = useState<ConnectorItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { statuses: connectorStatus, refresh: refreshStatuses } = useAllConnectorsStatus();
  const content = TAB_CONTENT[activeTab];
  const tabType = activeTab === 'connectors' ? 'connector' : activeTab === 'mcp' ? 'mcp' : 'skill';
  const { addToast } = useToast();

  const startOAuth = async (provider: string, clientId: string) => {
    try {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const codeVerifier = btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const encoder = new TextEncoder();
      const hash = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const state = crypto.randomUUID();

      localStorage.setItem(`${provider}_oauth_verifier`, codeVerifier);
      localStorage.setItem(`${provider}_oauth_state`, state);

      const res = await fetch(`http://localhost:3001/connector/${provider}/auth-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          codeChallenge,
          codeChallengeMethod: 'S256',
          state,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Failed to get auth URL:', err);
        return;
      }

      const { url } = await res.json();
      const popup = window.open(url, `${provider}-oauth`, 'width=500,height=700');

      const callbackType = `${provider}-oauth-callback`;

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === callbackType) {
          window.removeEventListener('message', handleMessage);

          const savedState = localStorage.getItem(`${provider}_oauth_state`);
          if (event.data.state !== savedState) {
            console.error('CSRF state mismatch — OAuth callback ignored');
            return;
          }

          const savedVerifier = localStorage.getItem(`${provider}_oauth_verifier`);
          localStorage.removeItem(`${provider}_oauth_verifier`);
          localStorage.removeItem(`${provider}_oauth_state`);

          fetch(`http://localhost:3001/connector/${provider}/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: event.data.code,
              codeVerifier: savedVerifier,
            }),
          }).then(() => {
            refreshStatuses();
            addToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} connected successfully!`, 'info', 3000);
          }).catch((err) => {
            console.error('Token exchange failed:', err);
            addToast(`${provider} connection failed: ${err.message || 'unknown error'}`, 'error', 5000);
          });
        }
      };
      window.addEventListener('message', handleMessage);

      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
          setTimeout(() => refreshStatuses(), 500);
        }
      }, 1000);
    } catch (err) {
      console.error(`${provider} connect error:`, err);
    }
  };

  const setTelegramToken = async (token: string) => {
    try {
      const res = await fetch('http://localhost:3001/connector/telegram/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast(`Telegram connection failed: ${err.error || 'unknown error'}`, 'error', 5000);
        return;
      }
      await refreshStatuses();
      addToast('Telegram connected successfully!', 'info', 3000);
    } catch (err) {
      console.error('Telegram connect error:', err);
    }
  };

  const handleConnectorAction = async (item: ConnectorItem) => {
    const id = item.connectorId;
    if (!id) return;
    const authType = CONNECTOR_AUTH_TYPES[id] || 'oauth2';
    if (authType === 'token') {
      // Token input is handled by the detail modal's onSetToken
      return;
    }
    if (connectorStatus[id]) return; // already connected
    startOAuth(id, 'env');
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return CONNECTOR_CATEGORIES;
    const q = searchQuery.toLowerCase();
    const result: Record<string, { label: string; items: ConnectorItem[] }> = {};
    for (const [key, cat] of Object.entries(CONNECTOR_CATEGORIES)) {
      const matched = cat.items.filter(
        item => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
      if (matched.length > 0) {
        result[key] = { label: cat.label, items: matched };
      }
    }
    return result;
  }, [searchQuery]);

  return (
    <div className="py-6">
      {/* Tab switches + Search bar */}
      <div className="flex items-center gap-3 mb-5 border-b border-border pb-2">
        <div className="flex gap-1.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 relative ${
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <HugeiconsIcon icon={tab.icon} size={16} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        <div className="ml-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plugins..."
            className="w-[260px] h-9 px-3 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Section header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>
        {activeTab === 'connectors' && (
          <p className="text-sm text-muted-foreground mt-1">
            Connect your AI to external services and data sources.
          </p>
        )}
        {activeTab === 'mcp' && (
          <p className="text-sm text-muted-foreground mt-1">{content.description}</p>
        )}
        {activeTab === 'skills' && (
          <p className="text-sm text-muted-foreground mt-1">{content.description}</p>
        )}
      </div>

      {/* Connectors with categories */}
      {activeTab === 'connectors' ? (
        <div className="space-y-6">
          {Object.entries(filteredCategories).map(([categoryKey, category]) => (
            <div key={categoryKey} className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {category.label}
              </span>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                {category.items.map((item, i) => (
                  <ConnectorCard
                    key={i}
                    label={item.name}
                    description={item.description}
                    imageSrc={item.imageSrc}
                    imageSrcDark={item.imageSrcDark}
                    type="connector"
                    connected={item.connectorId ? connectorStatus[item.connectorId] : undefined}
                    onClick={() => setSelectedItem(item)}
                    onAction={() => handleConnectorAction(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
          {content.items.map((item, i) => (
            <ConnectorCard
              key={i}
              label={item.name}
              description={item.description}
              icon={item.icon}
              imageSrc={item.imageSrc}
              imageSrcDark={item.imageSrcDark}
              type={activeTab === 'mcp' ? 'mcp' : 'skill'}
              stars={item.stars}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>
      )}

      {selectedItem && (
        <ConnectorDetailModal
          label={selectedItem.name}
          description={selectedItem.description}
          icon={selectedItem.icon!}
          imageSrc={selectedItem.imageSrc}
          type={tabType}
          stars={selectedItem.stars}
          details={selectedItem.details ?? []}
          isOpen={!!selectedItem}
          connected={selectedItem.connectorId ? connectorStatus[selectedItem.connectorId] : undefined}
          authType={selectedItem.connectorId ? CONNECTOR_AUTH_TYPES[selectedItem.connectorId] : undefined}
          onClose={() => setSelectedItem(null)}
          onAction={() => handleConnectorAction(selectedItem)}
          onSetToken={selectedItem.connectorId === 'telegram' ? setTelegramToken : undefined}
        />
      )}
    </div>
  );
};