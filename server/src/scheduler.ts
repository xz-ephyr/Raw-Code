const CHEAP_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const ANTIGRAVITY_REAL_SMOKE_INTERVAL_MS = 60 * 60 * 1000;

let lastCheapRunTimestamp: string | null = null;

const REQUIRED_ENV_KEYS = [
  'GOOGLE_API_KEY',
];

const OPTIONAL_ENV_KEYS = [
  'ANTIGRAVITY_API_KEY',
];

export interface CheapCheckResult {
  timestamp: string;
  envChecks: Array<{ key: string; present: boolean }>;
  antigravityMockReachable: boolean | null;
  antigravityRealSmoke: AntigravityRealSmokeResult | null;
  summary: { total: number; passed: number; failed: number };
}

export interface AntigravityRealSmokeResult {
  timestamp: string;
  endpoint: string;
  reachable: boolean;
  contractDrift: string[];
  details: string;
}

let lastCheapResult: CheapCheckResult | null = null;

async function runEnvChecks(): Promise<Array<{ key: string; present: boolean }>> {
  const checks: Array<{ key: string; present: boolean }> = [];

  for (const key of REQUIRED_ENV_KEYS) {
    checks.push({ key, present: !!process.env[key] });
  }
  for (const key of OPTIONAL_ENV_KEYS) {
    const present = !!process.env[key];
    if (present) {
      checks.push({ key, present: true });
    }
  }

  return checks;
}

const ANTIGRAVITY_REAL_BASE_URL = process.env['ANTIGRAVITY_REAL_BASE_URL'] || '';
const ANTIGRAVITY_ENV_KEY = process.env['ANTIGRAVITY_API_KEY'] || '';

async function checkAntigravityMock(): Promise<boolean | null> {
  try {
    const baseUrl = process.env['ANTIGRAVITY_BASE_URL'] || 'http://localhost:3001/antigravity/v1';
    const apiKey = process.env['ANTIGRAVITY_API_KEY'] || 'test-mock-key';

    const response = await fetch(`${baseUrl}/identity`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return null;
  }
}

async function checkAntigravityRealSmoke(): Promise<AntigravityRealSmokeResult> {
  const timestamp = new Date().toISOString();

  if (!ANTIGRAVITY_REAL_BASE_URL) {
    return {
      timestamp,
      endpoint: '(no ANTIGRAVITY_REAL_BASE_URL configured)',
      reachable: false,
      contractDrift: [],
      details: 'Skipped: no real backend URL configured. Set ANTIGRAVITY_REAL_BASE_URL to enable live smoke checks.',
    };
  }

  try {
    const identityUrl = `${ANTIGRAVITY_REAL_BASE_URL}/identity`;
    const response = await fetch(identityUrl, {
      headers: { Authorization: `Bearer ${ANTIGRAVITY_ENV_KEY}` },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const body = await response.json();
      const drift: string[] = [];

      if (body.status !== 'ok') drift.push(`Expected status "ok", got "${body.status}"`);
      if (body.service !== 'antigravity') drift.push(`Expected service "antigravity", got "${body.service}"`);

      return {
        timestamp,
        endpoint: identityUrl,
        reachable: true,
        contractDrift: drift,
        details: drift.length === 0
          ? 'Identity endpoint matches contract spec. No drift detected.'
          : `Contract drift detected: ${drift.join('; ')}`,
      };
    } else if (response.status === 401) {
      return {
        timestamp,
        endpoint: identityUrl,
        reachable: true,
        contractDrift: [],
        details: 'Backend reachable but authentication rejected (expected — key may differ from contract test key).',
      };
    } else {
      return {
        timestamp,
        endpoint: identityUrl,
        reachable: true,
        contractDrift: [`Unexpected HTTP ${response.status}`],
        details: `Backend responded with HTTP ${response.status}`,
      };
    }
  } catch (err: any) {
    return {
      timestamp,
      endpoint: `${ANTIGRAVITY_REAL_BASE_URL}/identity`,
      reachable: false,
      contractDrift: [],
      details: `Cannot reach real backend: ${err.message?.slice(0, 200) || 'Unknown error'}`,
    };
  }
}

export async function runCheapChecks(): Promise<CheapCheckResult> {
  const envChecks = await runEnvChecks();
  const [antigravityMockReachable, antigravityRealSmoke] = await Promise.all([
    checkAntigravityMock(),
    checkAntigravityRealSmoke(),
  ]);

  const passed = envChecks.filter((c) => c.present).length;
  const total = envChecks.length;
  const failed = total - passed;

  const result: CheapCheckResult = {
    timestamp: new Date().toISOString(),
    envChecks,
    antigravityMockReachable,
    antigravityRealSmoke,
    summary: { total, passed, failed },
  };

  if (antigravityRealSmoke.reachable && antigravityRealSmoke.contractDrift.length > 0) {
    console.warn(`[scheduler] ⚠️ ANTIGRAVITY CONTRACT DRIFT DETECTED: ${antigravityRealSmoke.contractDrift.join('; ')}`);
  }

  lastCheapResult = result;
  lastCheapRunTimestamp = result.timestamp;
  return result;
}

export function getLastCheapResult(): CheapCheckResult | null {
  return lastCheapResult;
}

export function getLastCheapRunTimestamp(): string | null {
  return lastCheapRunTimestamp;
}

export function startBackgroundScheduler(): void {
  runCheapChecks();
  setInterval(runCheapChecks, CHEAP_CHECK_INTERVAL_MS);
  console.log(`[scheduler] Background cheap checks running every ${CHEAP_CHECK_INTERVAL_MS / 1000}s`);
}
