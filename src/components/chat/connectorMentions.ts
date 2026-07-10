export const CONNECTOR_BRAND_COLORS: Record<string, { color: string; bg: string }> = {
  Gmail: { color: '#EA4335', bg: 'rgba(234, 67, 53, 0.15)' },
  GitHub: { color: '#24292e', bg: 'rgba(36, 41, 46, 0.15)' },
  Notion: { color: '#000000', bg: 'rgba(0, 0, 0, 0.1)' },
  Slack: { color: '#4A154B', bg: 'rgba(74, 21, 75, 0.15)' },
};

export const CONNECTOR_ICONS: Record<string, string> = {
  Gmail: '/gmail.svg',
  GitHub: '/github.svg',
  Notion: '/notion.svg',
  Slack: '/slack.svg',
};

export const CONNECTOR_DESCRIPTIONS: Record<string, string> = {
  Gmail: 'Read, send, and search through your inbox',
  GitHub: 'Browse repos, issues, pull requests, and code',
  Notion: 'Access docs, databases, wikis, and pages',
  Slack: 'Search channels, send messages, and read threads',
};

export const CONNECTOR_CATEGORIES: Record<string, string> = {
  Gmail: 'Communication',
  Slack: 'Communication',
  GitHub: 'Development',
  Notion: 'Productivity',
};

export const CONNECTOR_ACTIONS: Record<string, { label: string; description: string }[]> = {
  Gmail: [
    { label: 'read', description: 'Read inbox messages' },
    { label: 'send', description: 'Send an email' },
    { label: 'search', description: 'Search emails' },
  ],
  GitHub: [
    { label: 'repos', description: 'List repositories' },
    { label: 'issues', description: 'List issues' },
    { label: 'pr', description: 'List pull requests' },
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
};

export type ConnectorName = keyof typeof CONNECTOR_BRAND_COLORS;
export const CONNECTORS = Object.keys(CONNECTOR_BRAND_COLORS) as ConnectorName[];
