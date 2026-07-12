import { useState, useEffect, useCallback } from 'react';

const ZOOM_STORAGE_KEY = 'doktor::zoom-level';
const DEFAULT_ZOOM = 1.0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

export type ZoomLevel = number;

export function useZoom() {
  const [zoom, setZoom] = useState<ZoomLevel>(() => {
    try {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load zoom from localStorage', e);
    }
    return DEFAULT_ZOOM;
  });

  useEffect(() => {
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
    } catch (e) {
      console.warn('Failed to save zoom to localStorage', e);
    }
  }, [zoom]);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, +(prev + ZOOM_STEP).toFixed(1)));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, +(prev - ZOOM_STEP).toFixed(1)));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  const setZoomLevel = useCallback((level: number) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level)));
  }, []);

  return { zoom, zoomIn, zoomOut, resetZoom, setZoomLevel, MIN_ZOOM, MAX_ZOOM };
}
