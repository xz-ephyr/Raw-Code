import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { OnboardingPage, ChatPage, ChatsPage, SchedulePage, PluginsPage, WikiPage } from './pages';
import { ChatSessionManager } from './services/ChatSessionManager';

export default function App() {
  const [isMigrating, setIsMigrating] = useState(true);

  useEffect(() => {
    const migrate = async () => {
      try {
        await ChatSessionManager.migrateFromLocalStorage();
      } catch (error) {
        console.error('Migration failed:', error);
      } finally {
        setIsMigrating(false);
      }
    };
    migrate();
  }, []);

  if (isMigrating) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-neutral-500 animate-pulse font-medium">Initializing...</div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<OnboardingPage />} />
          <Route path="/thread/:uuid" element={<ChatPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/project/:uuid" element={<ChatPage />} />
          <Route path="/project/:folder/:uuid" element={<ChatPage />} />
          <Route path="/chat/:uuid" element={<ChatPage />} /> {/* Fallback */}
        </Routes>
      </Layout>
    </Router>
  );
}
