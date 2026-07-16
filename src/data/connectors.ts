import { ResourcesAddIcon, GlobeIcon, HandBag01Icon } from '@hugeicons/core-free-icons';
import type { ConnectorItem } from '@/components/plugins/types';

export const TABS = [
  { id: 'connectors', label: 'Connectors', icon: ResourcesAddIcon },
  { id: 'mcp', label: 'MCP', icon: GlobeIcon },
  { id: 'skills', label: 'Skills', icon: HandBag01Icon },
];

export const CONNECTOR_AUTH_TYPES: Record<string, 'oauth2' | 'token'> = {
  gmail: 'oauth2',
  github: 'oauth2',
  youtube: 'oauth2',
  reddit: 'oauth2',
  twitter: 'oauth2',
  telegram: 'token',
  'google-drive': 'oauth2',
};

export const CONNECTOR_CATEGORIES: Record<string, { label: string; items: ConnectorItem[] }> = {
  integrations: {
    label: 'Integrations',
    items: [
      { name: 'Gmail', description: 'Read, send, and manage your emails with AI assistance.', imageSrc: '/gmail.svg', details: ['Read inbox messages', 'Search emails by query', 'Send emails on your behalf', 'Manage labels and folders', 'Thread conversation support', 'Attachment handling'], connectorId: 'gmail' },
      { name: 'GitHub', description: 'Access repositories, issues, and pull requests.', imageSrc: '/github.svg', imageSrcDark: '/github-dark.svg', details: ['Repository access', 'Issue management', 'PR reviews', 'Code search'], connectorId: 'github' },
      { name: 'Notion', description: 'Read and write Notion documents and databases.', imageSrc: '/notion.svg', details: ['Page editing', 'Database queries', 'Block manipulation', 'Search'] },
      { name: 'Jira', description: 'Manage tickets, sprints, and project boards.', imageSrc: '/jira.svg', details: ['Ticket CRUD', 'Sprint planning', 'Board views', 'Custom fields'] },
      { name: 'Google Drive', description: 'Upload, download, and manage files in your Google Drive.', imageSrc: '/google-drive.svg', details: ['File upload & download', 'List files & folders', 'Create folders', 'File management'], connectorId: 'google-drive' },
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

export const TAB_CONTENT: Record<string, { title: string; description: string; items: ConnectorItem[] }> = {
  connectors: {
    title: 'Connectors',
    description: '',
    items: [
      { name: 'Gmail', description: 'Read, send, and manage your emails with AI assistance.', imageSrc: '/gmail.svg', details: ['Read inbox messages', 'Search emails by query', 'Send emails on your behalf', 'Manage labels and folders', 'Thread conversation support', 'Attachment handling'], connectorId: 'gmail' },
      { name: 'GitHub', description: 'Access repositories, issues, and pull requests.', imageSrc: '/github.svg', imageSrcDark: '/github-dark.svg', details: ['Repository access', 'Issue management', 'PR reviews', 'Code search'], connectorId: 'github' },
      { name: 'Notion', description: 'Read and write Notion documents and databases.', imageSrc: '/notion.svg', details: ['Page editing', 'Database queries', 'Block manipulation', 'Search'] },
      { name: 'Jira', description: 'Manage tickets, sprints, and project boards.', imageSrc: '/jira.svg', details: ['Ticket CRUD', 'Sprint planning', 'Board views', 'Custom fields'] },
      { name: 'Google Drive', description: 'Upload, download, and manage files in your Google Drive.', imageSrc: '/google-drive.svg', details: ['File upload & download', 'List files & folders', 'Create folders', 'File management'], connectorId: 'google-drive' },
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
