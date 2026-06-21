import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { OnboardingPage, ChatPage, ChatsPage, SchedulePage, PluginsPage, WikiPage } from './pages';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route element={<Layout />}>
          <Route path="/thread/:uuid" element={<ChatPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/project/:uuid" element={<ChatPage />} />
          <Route path="/project/:folder/:uuid" element={<ChatPage />} />
          <Route path="/chat/:uuid" element={<ChatPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
