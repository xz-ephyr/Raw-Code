import { useState, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ConnectorCard } from './ConnectorCard';
import { ConnectorDetailModal } from './ConnectorDetailModal';
import { useToast } from '../ui/Toast';
import { useAllConnectorsStatus } from '@/hooks/useConnectorStatus';
import { DatabaseService } from '@core/utils/DatabaseService';
import { TABS, TAB_CONTENT, CONNECTOR_AUTH_TYPES, CONNECTOR_CATEGORIES } from '@/data/connectors';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import type { ConnectorItem } from './types';

export const PluginTabs = () => {
  const [activeTab, setActiveTab] = useState('connectors');
  const [selectedItem, setSelectedItem] = useState<ConnectorItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { statuses: connectorStatus, refresh: refreshStatuses } = useAllConnectorsStatus();
  const content = TAB_CONTENT[activeTab];
  const tabType = activeTab === 'connectors' ? 'connector' : activeTab === 'mcp' ? 'mcp' : 'skill';
  const { addToast } = useToast();

  const startOAuth = async (provider: string, clientId: string, popup: Window): Promise<void> => {
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

    const res = await apiFetch(`${API_BASE_URL}/connector/${provider}/auth-url`, {
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
      throw new Error(err.error || 'Failed to get auth URL');
    }

    const { url } = await res.json();
    popup.location.href = url;

    const callbackType = `${provider}-oauth-callback`;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === callbackType) {
          window.removeEventListener('message', handleMessage);

          const savedState = localStorage.getItem(`${provider}_oauth_state`);
          if (event.data.state !== savedState) {
            reject(new Error('CSRF state mismatch — OAuth callback ignored'));
            return;
          }

          const savedVerifier = localStorage.getItem(`${provider}_oauth_verifier`);
          localStorage.removeItem(`${provider}_oauth_verifier`);
          localStorage.removeItem(`${provider}_oauth_state`);

          apiFetch(`${API_BASE_URL}/connector/${provider}/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: event.data.code,
              codeVerifier: savedVerifier,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: 'Exchange failed' }));
              throw new Error(err.error || 'Exchange failed');
            }
            settled = true;
            clearInterval(poll);
            refreshStatuses();
            resolve();
          }).catch((err) => {
            settled = true;
            clearInterval(poll);
            reject(err);
          });
        }
      };
      window.addEventListener('message', handleMessage);

      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          window.removeEventListener('message', handleMessage);
          if (!settled) reject(new Error('Authorization popup was closed'));
        }
      }, 1000);
    });
  };

  const setTelegramToken = async (token: string) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/connector/telegram/set-token`, {
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
    if (connectorStatus[id]) return; // already connected
    // Modal handles credential entry via onSetToken / onSetCredentials
  };

  const handleSetCredentials = async (provider: string, clientId: string, clientSecret: string) => {
    // Open popup synchronously before any await (must be within user gesture)
    const popup = window.open('', `${provider}-oauth`, 'width=500,height=700');
    if (!popup) {
      addToast('Popup blocked. Please allow popups for this site.', 'error', 5000);
      throw new Error('Popup blocked');
    }

    await DatabaseService.setConfig(`${provider}-client-id`, clientId);
    await DatabaseService.setConfig(`${provider}-client-secret`, clientSecret);
    try {
      await startOAuth(provider, clientId, popup);
      addToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} connected successfully!`, 'info', 3000);
    } catch (err: any) {
      try { popup.close(); } catch { /* popup may already be closed */ }
      addToast(`${provider} connection failed: ${err.message || 'unknown error'}`, 'error', 5000);
      throw err;
    }
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
        <div className="ml-auto flex-1 max-w-[460px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plugins..."
            className="w-full h-9 px-3 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Section header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>

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

      {selectedItem && (() => {
        const id = selectedItem.connectorId;
        const authType = id ? CONNECTOR_AUTH_TYPES[id] : undefined;
        return (
          <ConnectorDetailModal
            label={selectedItem.name}
            description={selectedItem.description}
            icon={selectedItem.icon!}
            imageSrc={selectedItem.imageSrc}
            type={tabType}
            isOpen={!!selectedItem}
            connected={id ? connectorStatus[id] : undefined}
            authType={authType}
            onClose={() => setSelectedItem(null)}
            onSetToken={id === 'telegram' ? setTelegramToken : undefined}
            onSetCredentials={authType === 'oauth2' && id && !connectorStatus[id]
              ? (cId, cSecret) => handleSetCredentials(id, cId, cSecret)
              : undefined}
          />
        );
      })()}
    </div>
  );
};