import { z } from 'zod';
import type { ToolDef } from '@core/types';

interface SystemInfo {
  os: string;
  platform: string;
  browser: string;
  language: string;
  cpuCores: number;
  memoryGB: number | null;
  isTauri: boolean;
  isMobile: boolean;
  timezone: string;
}

export function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Samsung')) return 'Samsung Internet';
  if (ua.includes('Edge') || ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

export function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}

export const systemInfoTool: ToolDef = {
  name: 'system_info',
  description: 'Get information about the current system including OS, platform, CPU cores, memory, and browser.',
  category: 'system',
  inputSchema: z.object({}),
  execute: async () => {
    const info: SystemInfo = {
      os: getOS(),
      platform: navigator.platform || 'unknown',
      browser: getBrowserInfo(),
      language: navigator.language,
      cpuCores: navigator.hardwareConcurrency || 0,
      memoryGB: (navigator as any).deviceMemory || null,
      isTauri: typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined,
      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    return info;
  },
};
