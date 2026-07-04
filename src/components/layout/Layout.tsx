import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import { SessionTitleProvider } from '@/contexts/SessionTitleContext';

export default function Layout() {
  return (
    <SessionTitleProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden"><Outlet /></main>
      </div>
    </SessionTitleProvider>
  );
}
