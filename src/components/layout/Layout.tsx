import { Outlet } from 'react-router-dom';
import TitleBar from './TitleBar';
import Sidebar from '../sidebar/Sidebar';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden"><Outlet /></main>
      </div>
    </div>
  );
}
