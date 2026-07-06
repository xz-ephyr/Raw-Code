import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { TerminalProvider, useTerminal } from '@/contexts/TerminalContext';
import { SessionTitleProvider } from '@/contexts/SessionTitleContext';

function LayoutContent() {
  const { visible, close } = useTerminal();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <main className="flex-1 min-w-0 overflow-hidden"><Outlet /></main>
        <TerminalPanel visible={visible} onClose={close} />
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <SessionTitleProvider>
      <TerminalProvider>
        <LayoutContent />
      </TerminalProvider>
    </SessionTitleProvider>
  );
}
