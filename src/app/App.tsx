import { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { isTauri } from '@/lib/tauri';
import UpdateModal from '@/components/ui/UpdateModal';

const ChatPage = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })));
const ChatsPage = lazy(() => import('@/pages/ChatsPage').then(m => ({ default: m.ChatsPage })));
const PluginsPage = lazy(() => import('@/pages/PluginsPage').then(m => ({ default: m.PluginsPage })));
const WorkflowPage = lazy(() => import('@/pages/WorkflowPage').then(m => ({ default: m.WorkflowPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

export default function App() {
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    currentVersion: string;
    body?: string;
    date?: string;
  } | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;

    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (cancelled || !update) return;

        setUpdateInfo({
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body,
          date: update.date,
        });
      } catch (e) {
        console.error('Update check failed:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleInstall = async () => {
    if (!updateInfo) return;
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
      }
    } catch (e) {
      console.error('Install failed:', e);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route element={<Layout />}>
          <Route path="/thread/:uuid" element={<Suspense fallback={null}><ChatPage /></Suspense>} />
          <Route path="/chats" element={<Suspense fallback={null}><ChatsPage /></Suspense>} />
          <Route path="/plugins" element={<Suspense fallback={null}><PluginsPage /></Suspense>} />
          <Route path="/workflow" element={<Suspense fallback={null}><WorkflowPage /></Suspense>} />
          <Route path="/chat/:uuid" element={<Suspense fallback={null}><ChatPage /></Suspense>} />
        </Route>
        <Route path="/settings" element={<Suspense fallback={null}><SettingsPage /></Suspense>} />
      </Routes>

      {updateInfo && (
        <UpdateModal
          update={updateInfo}
          onInstall={handleInstall}
          onLater={() => setUpdateInfo(null)}
        />
      )}
    </Router>
  );
}
