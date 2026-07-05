import type { ReactNode } from 'react';
import { ZoomProvider } from './ZoomProvider';
import { ToastProvider } from '../ui/Toast';
import { ThemeProvider } from '@/contexts/ThemeContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ZoomProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ZoomProvider>
    </ThemeProvider>
  );
}
