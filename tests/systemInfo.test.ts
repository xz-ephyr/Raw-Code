import { describe, it, expect, vi, beforeEach } from 'vitest';
import { systemInfoTool, getOS, getBrowserInfo } from '../core/tools/system/systemInfo';

describe('getOS', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { userAgent: '' });
  });

  it('returns Windows for Windows user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
    expect(getOS()).toBe('Windows');
  });

  it('returns macOS for Mac user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
    expect(getOS()).toBe('macOS');
  });

  it('returns Linux for Linux user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' });
    expect(getOS()).toBe('Linux');
  });

  it('returns Android for Android user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36' });
    expect(getOS()).toBe('Android');
  });

  it('returns iOS for iPhone user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/537.36' });
    expect(getOS()).toBe('iOS');
  });

  it('returns Unknown for unrecognized user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'SomeRandomUA/1.0' });
    expect(getOS()).toBe('Unknown');
  });
});

describe('getBrowserInfo', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { userAgent: '' });
  });

  it('returns Firefox for Firefox user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0' });
    expect(getBrowserInfo()).toBe('Firefox');
  });

  it('returns Samsung Internet for Samsung user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/22.0' });
    expect(getBrowserInfo()).toBe('Samsung Internet');
  });

  it('returns Edge for Edge user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' });
    expect(getBrowserInfo()).toBe('Edge');
  });

  it('returns Chrome for Chrome user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
    expect(getBrowserInfo()).toBe('Chrome');
  });

  it('returns Safari for Safari user agents', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' });
    expect(getBrowserInfo()).toBe('Safari');
  });

  it('returns Unknown for unrecognized browsers', () => {
    vi.stubGlobal('navigator', { userAgent: 'curl/8.0.1' });
    expect(getBrowserInfo()).toBe('Unknown');
  });
});

describe('systemInfoTool.execute', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: 'en-US',
      hardwareConcurrency: 8,
      deviceMemory: 8,
    });
    vi.stubGlobal('Intl', {
      DateTimeFormat: vi.fn().mockImplementation(() => ({
        resolvedOptions: () => ({ timeZone: 'America/New_York' }),
      })),
    });
    vi.stubGlobal('window', { __TAURI_INTERNALS__: undefined });
  });

  it('returns system info with correct values', async () => {
    const result = await systemInfoTool.execute();
    expect(result).toEqual({
      os: 'Windows',
      platform: 'Win32',
      browser: 'Chrome',
      language: 'en-US',
      cpuCores: 8,
      memoryGB: 8,
      isTauri: false,
      isMobile: false,
      timezone: 'America/New_York',
    });
  });

  it('detects Tauri environment', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    const result = await systemInfoTool.execute();
    expect(result.isTauri).toBe(true);
  });

  it('detects mobile device', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/537.36',
      platform: 'iPhone',
      language: 'en-US',
      hardwareConcurrency: 4,
    });
    const result = await systemInfoTool.execute();
    expect(result.isMobile).toBe(true);
    expect(result.os).toBe('iOS');
  });
});
