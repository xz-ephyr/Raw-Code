import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useZoom } from '@/hooks/useZoom';
import { isTauri } from '@/lib/tauri';

interface ZoomContextValue {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoomLevel: (level: number) => void;
}

const ZoomContext = createContext<ZoomContextValue | null>(null);

export function useZoomContext() {
  const ctx = useContext(ZoomContext);
  if (!ctx) throw new Error('useZoomContext must be used within ZoomProvider');
  return ctx;
}

export function ZoomProvider({ children }: { children: ReactNode }) {
  const { zoom, zoomIn, zoomOut, resetZoom, setZoomLevel } = useZoom();
  const zoomRef = useRef(zoom);
  const throttleRef = useRef(0);

  const zoomInRef = useRef(zoomIn);
  const zoomOutRef = useRef(zoomOut);
  const resetZoomRef = useRef(resetZoom);

  useEffect(() => {
    zoomInRef.current = zoomIn;
    zoomOutRef.current = zoomOut;
    resetZoomRef.current = resetZoom;
  });

  useEffect(() => {
    zoomRef.current = zoom;
  });

  useEffect(() => {
    if (isTauri()) {
      (async () => {
        try {
          const { getCurrentWebview } = await import('@tauri-apps/api/webview');
          await getCurrentWebview().setZoom(zoom);
        } catch {
          document.documentElement.style.zoom = String(zoom);
        }
      })();
    } else {
      document.documentElement.style.zoom = String(zoom);
    }
  }, [zoom]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();

    const now = Date.now();
    if (now - throttleRef.current < 50) return;
    throttleRef.current = now;

    if (e.deltaY < 0) {
      zoomInRef.current();
    } else {
      zoomOutRef.current();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomInRef.current();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOutRef.current();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoomRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ZoomContext.Provider value={{ zoom, zoomIn, zoomOut, resetZoom, setZoomLevel }}>
      {children}
    </ZoomContext.Provider>
  );
}
