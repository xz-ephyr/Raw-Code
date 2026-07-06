import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Tab } from './types';
import { createDefaultTab } from './defaults';

interface InternalState {
  tabs: Tab[];
  activeTabId: string;
  tabHistory: Map<string, string[]>;
  tabHistoryIndex: Map<string, number>;
}

type Action =
  | { type: 'ADD_TAB'; url: string }
  | { type: 'REMOVE_TAB'; id: string }
  | { type: 'SWITCH_TAB'; id: string }
  | { type: 'UPDATE_TAB'; id: string; url?: string; title?: string; isLoading?: boolean; favicon?: string }
  | { type: 'NAVIGATE'; url: string }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' };

function createInitialState(): InternalState {
  const defaultTab = createDefaultTab();
  const tabHistory = new Map<string, string[]>();
  tabHistory.set(defaultTab.id, [defaultTab.url]);
  const tabHistoryIndex = new Map<string, number>();
  tabHistoryIndex.set(defaultTab.id, 0);

  return {
    tabs: [defaultTab],
    activeTabId: defaultTab.id,
    tabHistory,
    tabHistoryIndex,
  };
}

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'ADD_TAB': {
      const newTab = createDefaultTab();
      newTab.url = action.url;
      newTab.title = action.url || 'New Tab';
      const tabHistory = new Map(state.tabHistory);
      tabHistory.set(newTab.id, [action.url]);
      const tabHistoryIndex = new Map(state.tabHistoryIndex);
      tabHistoryIndex.set(newTab.id, 0);
      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        tabHistory,
        tabHistoryIndex,
      };
    }

    case 'REMOVE_TAB': {
      const newTabs = state.tabs.filter((t) => t.id !== action.id);
      if (newTabs.length === 0) {
        return createInitialState();
      }
      let newActiveId = state.activeTabId;
      if (action.id === state.activeTabId) {
        const removedIndex = state.tabs.findIndex((t) => t.id === action.id);
        newActiveId = newTabs[Math.min(removedIndex, newTabs.length - 1)].id;
      }
      const tabHistory = new Map(state.tabHistory);
      tabHistory.delete(action.id);
      const tabHistoryIndex = new Map(state.tabHistoryIndex);
      tabHistoryIndex.delete(action.id);
      return {
        ...state,
        tabs: newTabs,
        activeTabId: newActiveId,
        tabHistory,
        tabHistoryIndex,
      };
    }

    case 'SWITCH_TAB': {
      return { ...state, activeTabId: action.id };
    }

    case 'UPDATE_TAB': {
      const newTabs = state.tabs.map((t) => {
        if (t.id !== action.id) return t;
        return {
          ...t,
          ...(action.url !== undefined && { url: action.url }),
          ...(action.title !== undefined && { title: action.title }),
          ...(action.isLoading !== undefined && { isLoading: action.isLoading }),
          ...(action.favicon !== undefined && { favicon: action.favicon }),
        };
      });
      return { ...state, tabs: newTabs };
    }

    case 'NAVIGATE': {
      const currentTab = state.tabs.find((t) => t.id === state.activeTabId);
      if (!currentTab) return state;
      const tabHistory = new Map(state.tabHistory);
      const tabHistoryIndex = new Map(state.tabHistoryIndex);
      const currentStack = tabHistory.get(state.activeTabId) || [];
      const currentIndex = tabHistoryIndex.get(state.activeTabId) ?? -1;
      const newStack = currentStack.slice(0, currentIndex + 1);
      newStack.push(action.url);
      tabHistory.set(state.activeTabId, newStack);
      tabHistoryIndex.set(state.activeTabId, newStack.length - 1);
      const newTabs = state.tabs.map((t) => {
        if (t.id !== state.activeTabId) return t;
        return { ...t, url: action.url, title: action.url, isLoading: true };
      });
      return { ...state, tabs: newTabs, tabHistory, tabHistoryIndex };
    }

    case 'GO_BACK': {
      const currentStack = state.tabHistory.get(state.activeTabId);
      const currentIndex = state.tabHistoryIndex.get(state.activeTabId) ?? -1;
      if (!currentStack || currentIndex <= 0) return state;
      const newIndex = currentIndex - 1;
      const prevUrl = currentStack[newIndex];
      const tabHistoryIndex = new Map(state.tabHistoryIndex);
      tabHistoryIndex.set(state.activeTabId, newIndex);
      const newTabs = state.tabs.map((t) => {
        if (t.id !== state.activeTabId) return t;
        return { ...t, url: prevUrl, title: prevUrl, isLoading: true };
      });
      return { ...state, tabs: newTabs, tabHistoryIndex };
    }

    case 'GO_FORWARD': {
      const currentStack = state.tabHistory.get(state.activeTabId);
      const currentIndex = state.tabHistoryIndex.get(state.activeTabId) ?? -1;
      if (!currentStack || currentIndex >= currentStack.length - 1) return state;
      const newIndex = currentIndex + 1;
      const nextUrl = currentStack[newIndex];
      const tabHistoryIndex = new Map(state.tabHistoryIndex);
      tabHistoryIndex.set(state.activeTabId, newIndex);
      const newTabs = state.tabs.map((t) => {
        if (t.id !== state.activeTabId) return t;
        return { ...t, url: nextUrl, title: nextUrl, isLoading: true };
      });
      return { ...state, tabs: newTabs, tabHistoryIndex };
    }

    default:
      return state;
  }
}

interface BrowserContextValue {
  state: InternalState;
  dispatch: React.Dispatch<Action>;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

export function BrowserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  return (
    <BrowserContext.Provider value={{ state, dispatch }}>
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowser() {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error('useBrowser must be used within a BrowserProvider');
  }
  return {
    state: context.state,
    dispatch: context.dispatch,
  };
}
