import { useState, useCallback, useEffect } from 'react';
export const useResizablePane = (initialWidth = 50) => {
  const [paneWidth, setPaneWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = 100 - (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) setPaneWidth(newWidth);
    }
  }, [isResizing]);
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);
  return { paneWidth, isResizing, startResizing };
};
