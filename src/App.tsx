import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/sidebar/Sidebar';
import { OnboardingPage, ChatPage, SchedulePage, PluginsPage, WikiPage, ProjectPage, SettingsPage } from './pages';

export default function App() {
  return (
    <Router>
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<OnboardingPage />} />
            <Route path="/chat/:uuid" element={<ChatPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/plugins" element={<PluginsPage />} />
            <Route path="/wiki" element={<WikiPage />} />
            <Route path="/project/:uuid" element={<ProjectPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
