import { Tab } from './types';

export const DEFAULT_HOMEPAGE = 'about:blank';
export const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=';

export function createDefaultTab(): Tab {
  return {
    id: crypto.randomUUID(),
    title: 'New Tab',
    url: DEFAULT_HOMEPAGE,
    isLoading: false,
    favicon: undefined,
  };
}
