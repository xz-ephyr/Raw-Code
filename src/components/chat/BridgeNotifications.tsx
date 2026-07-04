import { useEffect } from 'react';
import { useToast } from '../ui/Toast';

export function BridgeNotifications() {
  const { addToast } = useToast();

  useEffect(() => {
    const onConnect = () => addToast('Connected to opencode CLI', 'success', 0);
    const onDisconnect = () => addToast('Disconnected from opencode CLI', 'warning', 0);

    window.addEventListener('opencode-connected', onConnect);
    window.addEventListener('opencode-disconnected', onDisconnect);
    return () => {
      window.removeEventListener('opencode-connected', onConnect);
      window.removeEventListener('opencode-disconnected', onDisconnect);
    };
  }, [addToast]);

  return null;
}
