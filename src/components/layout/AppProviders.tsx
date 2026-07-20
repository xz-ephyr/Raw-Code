import type { ReactNode } from 'react';
import { ZoomProvider } from './ZoomProvider';
import { ToastProvider } from '../ui/Toast';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ModelRegistryProvider } from '@/contexts/ModelRegistryContext';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ZoomProvider>
        <ToastProvider>
          <ModelRegistryProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ModelRegistryProvider>
        </ToastProvider>
      </ZoomProvider>
    </ThemeProvider>
  );
}
