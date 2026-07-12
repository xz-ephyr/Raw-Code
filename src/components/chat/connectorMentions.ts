export const CONNECTOR_BRAND_COLORS: Record<string, { color: string; bg: string }> = {
  GitHub: { color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.15)' },
  Gmail: { color: '#EA4335', bg: 'rgba(234, 67, 53, 0.15)' },
  Notion: { color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.1)' },
  Slack: { color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.15)' },
  Telegram: { color: '#0088CC', bg: 'rgba(0, 136, 204, 0.15)' },
  Reddit: { color: '#FF4500', bg: 'rgba(255, 69, 0, 0.15)' },
  Twitter: { color: '#1DA1F2', bg: 'rgba(29, 161, 242, 0.15)' },
  YouTube: { color: '#FF0000', bg: 'rgba(255, 0, 0, 0.15)' },
};

export const CONNECTOR_ICONS: Record<string, string> = {
  GitHub: '/github.svg',
  Gmail: '/gmail.svg',
  Notion: '/notion.svg',
  Slack: '/slack.svg',
  Telegram: '/telegram.svg',
  Reddit: '/reddit.svg',
  Twitter: '/twitter.svg',
  YouTube: '/youtube.svg',
};

export const CONNECTOR_DESCRIPTIONS: Record<string, string> = {
  GitHub: 'Browse repos, issues, pull requests, and code',
  Gmail: 'Read, send, and search through your inbox',
  Notion: 'Access docs, databases, wikis, and pages',
  Slack: 'Search channels, send messages, and read threads',
  Telegram: 'Send messages and manage Telegram chats',
  Reddit: 'Read and post to Reddit communities',
  Twitter: 'Post tweets and read timelines',
  YouTube: 'Search videos and manage playlists',
};

export const CONNECTOR_CATEGORIES: Record<string, string> = {
  GitHub: 'Development',
  Gmail: 'Communication',
  Notion: 'Productivity',
  Slack: 'Communication',
  Telegram: 'Communication',
  Reddit: 'Social',
  Twitter: 'Social',
  YouTube: 'Media',
};

export const CONNECTOR_ACTIONS: Record<string, { label: string; description: string }[]> = {
  GitHub: [
    { label: 'repos', description: 'List repositories' },
    { label: 'issues', description: 'List issues' },
    { label: 'pr', description: 'List pull requests' },
  ],
  Gmail: [
    { label: 'read', description: 'Read inbox messages' },
    { label: 'send', description: 'Send an email' },
    { label: 'search', description: 'Search emails' },
  ],
  Notion: [
    { label: 'read', description: 'Read a page' },
    { label: 'write', description: 'Write to a page' },
    { label: 'search', description: 'Search pages' },
  ],
  Slack: [
    { label: 'channels', description: 'List channels' },
    { label: 'send', description: 'Send a message' },
    { label: 'search', description: 'Search messages' },
  ],
  Telegram: [
    { label: 'send', description: 'Send a message' },
    { label: 'chat', description: 'Get chat info' },
  ],
  Reddit: [
    { label: 'hot', description: 'Hot posts' },
    { label: 'search', description: 'Search posts' },
    { label: 'submit', description: 'Submit a post' },
  ],
  Twitter: [
    { label: 'timeline', description: 'View timeline' },
    { label: 'tweet', description: 'Post a tweet' },
    { label: 'search', description: 'Search tweets' },
  ],
  YouTube: [
    { label: 'search', description: 'Search videos' },
    { label: 'playlists', description: 'View playlists' },
  ],
};

export type ConnectorName = keyof typeof CONNECTOR_BRAND_COLORS;
export const CONNECTORS = Object.keys(CONNECTOR_BRAND_COLORS) as ConnectorName[];

export const SHORTCUT_NAMES = ['reasoning', 'web-search'] as const;
export type ShortcutName = typeof SHORTCUT_NAMES[number];
