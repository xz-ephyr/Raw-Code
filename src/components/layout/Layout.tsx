import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import { SessionTitleProvider } from '@/contexts/SessionTitleContext';

export default function Layout() {
  return (
    <SessionTitleProvider>
      <div className="flex h-full overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden"><Outlet /></main>
        </div>
      </div>
    </SessionTitleProvider>
  );
}
