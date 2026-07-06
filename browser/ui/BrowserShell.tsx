import { NavigationBar } from './NavigationBar';
import { BrowserView } from './BrowserView';
import { TabBar } from './TabBar';

export function BrowserShell() {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      <TabBar />
      <NavigationBar />
      <div className="relative flex-1">
        <BrowserView />
      </div>
    </div>
  );
}
