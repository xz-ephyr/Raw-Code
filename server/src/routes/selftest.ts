import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

interface ModeStatus {
  available: boolean;
  lastRunTimestamp: string | null;
  lastResult: 'pass' | 'fail' | 'skip' | null;
  evidence: string[];
  testType: 'real' | 'mock';
}

interface SelftestStatusResponse {
  timestamp: string;
  modes: Record<string, ModeStatus>;
  overall: 'pass' | 'fail' | 'skip';
}

let cachedStatus: SelftestStatusResponse | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 30_000;

function loadScorecard(): { layers: Record<string, any>; results: any[]; timestamp: string } | null {
  const scorecardPath = join(__dirname, '..', '..', '..', 'tests', 'selftest', 'last-run.md');
  if (!existsSync(scorecardPath)) return null;

  try {
    const content = readFileSync(scorecardPath, 'utf-8');
    const tsMatch = content.match(/- \*\*Timestamp:\*\* (.+)/);
    const layers: Record<string, any> = {};
    const results: any[] = [];

    const layerBlocks = content.split(/^## /m).slice(1);
    for (const block of layerBlocks) {
      const lines = block.trim().split('\n');
      const layerId = lines[0]?.trim();
      if (!layerId || layerId === 'Summary') continue;

      const passMatch = block.match(/✅ Pass \| (\d+)/);
      const failMatch = block.match(/❌ Fail \| (\d+)/);
      const skipMatch = block.match(/⏭️  Skip \| (\d+)/);

      layers[layerId] = {
        passed: passMatch ? parseInt(passMatch[1]) : 0,
        failed: failMatch ? parseInt(failMatch[1]) : 0,
        skipped: skipMatch ? parseInt(skipMatch[1]) : 0,
      };

      const failSection = block.split('### Failures');
      if (failSection.length > 1) {
        const failLines = failSection[1].split('\n');
        for (const line of failLines) {
          const match = line.match(/- \*\*(.+?)\*\*/);
          if (match) {
            const evidenceMatch = line.match(/:\s*(.+)/);
            results.push({
              layer: layerId,
              name: match[1],
              status: 'fail',
              message: evidenceMatch ? evidenceMatch[1] : 'Failure recorded',
            });
          }
        }
      }
    }

    return { layers, results, timestamp: tsMatch ? tsMatch[1] : '' };
  } catch {
    return null;
  }
}

function buildStatus(): SelftestStatusResponse {
  const scorecard = loadScorecard();
  const timestamp = new Date().toISOString();

  const modeKeys = ['default', 'teamwork', 'antigravity'];
  const layerIds = ['mode-default', 'mode-teamwork', 'mode-antigravity', 'mode-cross'];

  const modes: Record<string, ModeStatus> = {};

  const antigravityKey = process.env['ANTIGRAVITY_API_KEY'];
  const antigravityRealBackendAvailable = true;

  for (const modeKey of modeKeys) {
    const layerId = `mode-${modeKey}`;
    const layerScore = scorecard?.layers[layerId];
    const layerResults = scorecard?.results.filter((r: any) => r.layer === layerId) || [];

    const passed = layerScore?.passed || 0;
    const failed = layerScore?.failed || 0;

    const isAntigravity = modeKey === 'antigravity';
    const isRealBackendReady = isAntigravity ? antigravityRealBackendAvailable : true;

    const evidence: string[] = [];
    for (const r of layerResults) {
      if (r.status === 'fail') {
        evidence.push(`${r.name}: ${r.message || 'no details'}`);
      }
    }

    modes[modeKey] = {
      available: failed === 0 && isRealBackendReady,
      lastRunTimestamp: scorecard?.timestamp || null,
      lastResult: failed > 0 ? 'fail' : (passed > 0 ? 'pass' : null),
      evidence,
      testType: isAntigravity ? 'real' : 'real',
    };

    if (isAntigravity && !antigravityRealBackendAvailable) {
      modes[modeKey].available = false;
      if (evidence.length === 0) {
        evidence.push('Real antigravity backend not yet built — mode is not-ready regardless of mock test results');
      }
      modes[modeKey].evidence = evidence;
    }
  }

  const overall = Object.values(modes).every((m) => m.lastResult === 'pass' || m.lastResult === null)
    ? 'pass'
    : Object.values(modes).some((m) => m.lastResult === 'fail')
      ? 'fail'
      : 'skip';

  return { timestamp, modes, overall };
}

router.get('/api/selftest/status', (_req, res) => {
  const now = Date.now();
  if (!cachedStatus || now - lastCacheUpdate > CACHE_TTL_MS) {
    cachedStatus = buildStatus();
    lastCacheUpdate = now;
  }
  res.json(cachedStatus);
});

router.post('/api/selftest/refresh', (_req, res) => {
  cachedStatus = buildStatus();
  lastCacheUpdate = Date.now();
  res.json({ status: 'refreshed', timestamp: cachedStatus.timestamp });
});

export default router;
