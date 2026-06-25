import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import TitleBar from './TitleBar';
import { SessionTitleProvider } from '../../hooks/useSessionTitle';

export default function Layout() {
  return (
    <SessionTitleProvider>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-col shrink-0">
          <TitleBar />
          <Sidebar />
        </div>
        <main className="flex-1 min-w-0 overflow-hidden"><Outlet /></main>
      </div>
    </SessionTitleProvider>
  );
}
