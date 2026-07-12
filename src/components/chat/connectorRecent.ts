import type { ConnectorName } from './connectorMentions';

const RECENTLY_USED_KEY = 'connector-recently-used';
const MAX_RECENT = 3;

export function getRecentlyUsed(): ConnectorName[] {
  try {
    const stored = localStorage.getItem(RECENTLY_USED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentlyUsed(name: ConnectorName) {
  const recent = getRecentlyUsed().filter((n) => n !== name);
  recent.unshift(name);
  localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}
