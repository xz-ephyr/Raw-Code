import { useState, useCallback, useRef } from 'react';

function getPanelMaxWidth(): number {
  return Math.floor(Math.min(960, window.innerWidth * 0.75));
}

function getDefaultPanelWidth(): number {
  return 480;
}

export function useResizablePanel(
  storageKey: string = 'file-panel-width',
  options?: { minWidth?: number; maxWidth?: number }
) {
  const computeMaxWidth = useCallback(() => options?.maxWidth ?? getPanelMaxWidth(), [options?.maxWidth]);

  const computeMinWidth = useCallback(() => {
    return options?.minWidth ?? 360;
  }, [options?.minWidth]);

  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const defaultWidth = getDefaultPanelWidth();
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        return Math.max(computeMinWidth(), Math.min(computeMaxWidth(), parsed));
      }
    } catch (e) { console.warn('Failed to load panel width from localStorage:', e); }
    return Math.max(computeMinWidth(), Math.min(computeMaxWidth(), defaultWidth));
  });
  const isResizing = useRef(false);

  const startResize = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (clientX: number) => {
      if (!isResizing.current) return;
      const max = computeMaxWidth();
      const min = computeMinWidth();
      const clamped = Math.max(min, Math.min(max, window.innerWidth - clientX));
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
  }, [computeMinWidth, computeMaxWidth, storageKey]);

  const handleDividerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 20;
    let newWidth = panelWidth;
    let handled = true;
    const max = computeMaxWidth();
    const min = computeMinWidth();

    switch (e.key) {
      case 'ArrowLeft':
        newWidth = Math.max(min, panelWidth - step);
        break;
      case 'ArrowRight':
        newWidth = Math.min(max, panelWidth + step);
        break;
      case 'Home':
        newWidth = min;
        break;
      case 'End':
        newWidth = max;
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      setPanelWidth(newWidth);
      localStorage.setItem(storageKey, String(newWidth));
    }
  }, [panelWidth, computeMinWidth, computeMaxWidth, storageKey]);

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
    PANEL_MIN_WIDTH: computeMinWidth(),
    PANEL_MAX_WIDTH: computeMaxWidth(),
  };
}
