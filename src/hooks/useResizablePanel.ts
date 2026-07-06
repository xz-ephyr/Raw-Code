import { useState, useCallback, useRef } from 'react';

const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 960;
const DEFAULT_PANEL_WIDTH = 480;

export function useResizablePanel(
  storageKey: string = 'artifact-panel-width',
  options?: { minWidth?: number; maxWidth?: number }
) {
  const minWidth = options?.minWidth ?? PANEL_MIN_WIDTH;
  const maxWidth = options?.maxWidth ?? PANEL_MAX_WIDTH;

  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10)));
      }
    } catch { /* ignore */ }
    return DEFAULT_PANEL_WIDTH;
  });
  const isResizing = useRef(false);

  const startResize = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (clientX: number) => {
      if (!isResizing.current) return;
      const clamped = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - clientX));
      setPanelWidth(clamped);
    };

    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      setPanelWidth((prev) => {
        localStorage.setItem(storageKey, String(prev));
        return prev;
      });
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onMouseUp = () => onUp();
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const onTouchEnd = () => onUp();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, [minWidth, maxWidth]);

  const handleDividerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 20;
    let newWidth = panelWidth;
    let handled = true;

    switch (e.key) {
      case 'ArrowLeft':
        newWidth = Math.max(minWidth, panelWidth - step);
        break;
      case 'ArrowRight':
        newWidth = Math.min(maxWidth, panelWidth + step);
        break;
      case 'Home':
        newWidth = minWidth;
        break;
      case 'End':
        newWidth = maxWidth;
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      setPanelWidth(newWidth);
      localStorage.setItem(storageKey, String(newWidth));
    }
  }, [panelWidth, minWidth, maxWidth]);

  return {
    panelWidth,
    setPanelWidth,
    isResizing,
    startResize: useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      startResize();
    }, [startResize]),
    handleTouchStart: useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      startResize();
    }, [startResize]),
    handleDividerKeyDown,
    PANEL_MIN_WIDTH: minWidth,
    PANEL_MAX_WIDTH: maxWidth,
  };
}
