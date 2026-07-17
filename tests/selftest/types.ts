export interface SelfTestResult {
  layer: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  durationMs: number;
}

export interface LayerManifest {
  id: string;
  name: string;
  description: string;
  requiresFull: boolean;
  requiresEnv: string[];
  run: () => Promise<SelfTestResult[]>;
}

export interface Scorecard {
  timestamp: string;
  version: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  layers: Record<string, LayerScore>;
  results: SelfTestResult[];
}

export interface LayerScore {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export const VERSION = '0.1.0-dev';
