import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SelfTestResult, LayerManifest, Scorecard, LayerScore } from './types';
import { VERSION } from './types';

const _dirname = dirname(fileURLToPath(import.meta.url));
const SCORECARD_PATH = join(_dirname, 'last-run.md');
const HISTORY_PATH = join(_dirname, 'history.jsonl');

export function summarize(manifest: LayerManifest[]): string {
  return manifest.map((l) => `  ${l.id}: ${l.name} (${l.requiresFull ? 'full' : 'quick'})`).join('\n');
}

export function checkEnvVars(keys: string[]): { missing: string[]; present: string[] } {
  const missing: string[] = [];
  const present: string[] = [];
  for (const k of keys) {
    if (process.env[k]) present.push(k);
    else missing.push(k);
  }
  return { missing, present };
}

export async function runLayer(
  manifest: LayerManifest,
  full: boolean,
): Promise<{ results: SelfTestResult[]; duration: number }> {
  if (manifest.requiresFull && !full) {
    const skip: SelfTestResult = {
      layer: manifest.id,
      name: `${manifest.id}:${manifest.name}`,
      status: 'skip',
      message: 'Requires --full flag',
      durationMs: 0,
    };
    return { results: [skip], duration: 0 };
  }

  const missingEnv = manifest.requiresEnv.filter((k) => !process.env[k]);
  if (missingEnv.length > 0) {
    const skip: SelfTestResult = {
      layer: manifest.id,
      name: `${manifest.id}:${manifest.name}`,
      status: 'skip',
      message: `Missing env: ${missingEnv.join(', ')}`,
      durationMs: 0,
    };
    return { results: [skip], duration: 0 };
  }

  const start = Date.now();
  const results = await manifest.run();
  const duration = Date.now() - start;
  return { results, duration };
}

function computeLayerScore(results: SelfTestResult[]): LayerScore {
  return {
    total: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    skipped: results.filter((r) => r.status === 'skip').length,
  };
}

function renderScorecard(scorecard: Scorecard): string {
  const lines: string[] = [];
  lines.push(`# Self-Test Scorecard`);
  lines.push(``);
  lines.push(`- **Version:** ${scorecard.version}`);
  lines.push(`- **Timestamp:** ${scorecard.timestamp}`);
  lines.push(`- **Duration:** ${scorecard.summary.durationMs}ms`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Status | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| ✅ Pass | ${scorecard.summary.passed} |`);
  lines.push(`| ❌ Fail | ${scorecard.summary.failed} |`);
  lines.push(`| ⏭️  Skip | ${scorecard.summary.skipped} |`);
  lines.push(`| **Total** | **${scorecard.summary.total}** |`);
  lines.push(``);

  for (const [layerId, ls] of Object.entries(scorecard.layers)) {
    const layerResults = scorecard.results.filter((r) => r.layer === layerId);
    lines.push(`## ${layerId}`);
    lines.push(``);
    lines.push(`| Status | Count |`);
    lines.push(`|--------|------:|`);
    lines.push(`| ✅ Pass | ${ls.passed} |`);
    lines.push(`| ❌ Fail | ${ls.failed} |`);
    lines.push(`| ⏭️  Skip | ${ls.skipped} |`);
    lines.push(`| **Total** | **${ls.total}** |`);
    lines.push(``);

    if (ls.failed > 0) {
      lines.push(`### Failures`);
      lines.push(``);
      for (const r of layerResults) {
        if (r.status === 'fail') {
          lines.push(`- **${r.name}** (${r.durationMs}ms): ${r.message ?? 'no details'}`);
        }
      }
      lines.push(``);
    }
  }

  return lines.join('\n');
}

function loadPreviousScorecard(): Scorecard | null {
  if (!existsSync(SCORECARD_PATH)) return null;
  const content = readFileSync(SCORECARD_PATH, 'utf-8');
  const passMatch = content.match(/✅ Pass \| (\d+)/);
  const failMatch = content.match(/❌ Fail \| (\d+)/);
  const skipMatch = content.match(/⏭️  Skip \| (\d+)/);
  const totalMatch = content.match(/\*\*Total\*\* \| \*\*(\d+)\*\*/);
  const durationMatch = content.match(/- \*\*Duration:\*\* (\d+)ms/);
  const versionMatch = content.match(/- \*\*Version:\*\* (.+)/);
  if (!passMatch || !failMatch || !skipMatch || !totalMatch) return null;
  return {
    timestamp: content.match(/- \*\*Timestamp:\*\* (.+)/)?.[1] ?? '',
    version: versionMatch?.[1] ?? '',
    summary: {
      total: parseInt(totalMatch[1]),
      passed: parseInt(passMatch[1]),
      failed: parseInt(failMatch[1]),
      skipped: parseInt(skipMatch[1]),
      durationMs: durationMatch ? parseInt(durationMatch[1]) : 0,
    },
    layers: {},
    results: [],
  };
}

export function buildScorecard(
  allResults: SelfTestResult[],
  totalDurationMs: number,
): Scorecard {
  const layers = new Map<string, SelfTestResult[]>();
  for (const r of allResults) {
    const existing = layers.get(r.layer) ?? [];
    existing.push(r);
    layers.set(r.layer, existing);
  }

  const layerScores: Record<string, LayerScore> = {};
  for (const [id, results] of layers) {
    layerScores[id] = computeLayerScore(results);
  }

  const total = allResults.length;
  const passed = allResults.filter((r) => r.status === 'pass').length;
  const failed = allResults.filter((r) => r.status === 'fail').length;
  const skipped = allResults.filter((r) => r.status === 'skip').length;

  return {
    timestamp: new Date().toISOString(),
    version: VERSION,
    summary: { total, passed, failed, skipped, durationMs: totalDurationMs },
    layers: layerScores,
    results: allResults,
  };
}

export function emitScorecard(scorecard: Scorecard): void {
  const markdown = renderScorecard(scorecard);
  writeFileSync(SCORECARD_PATH, markdown, 'utf-8');

  const line = JSON.stringify({ timestamp: scorecard.timestamp, summary: scorecard.summary });
  mkdirSync(join(_dirname, '..'), { recursive: true });
  writeFileSync(HISTORY_PATH, line + '\n', { encoding: 'utf-8', flag: existsSync(HISTORY_PATH) ? 'a' : 'w' });

  const prev = loadPreviousScorecard();
  if (prev) {
    const regressed = prev.summary.passed - scorecard.summary.passed;
    const improved = scorecard.summary.passed - prev.summary.passed;
    console.log();
    if (regressed > 0) console.log(`⚠️  Regression: ${regressed} fewer passes than previous run`);
    if (improved > 0) console.log(`✅ Improvement: ${improved} more passes than previous run`);
    if (regressed === 0 && improved === 0) console.log(`📊 Same pass count as previous run`);
  }
}

export function exitCode(scorecard: Scorecard): number {
  return scorecard.summary.failed > 0 ? 1 : 0;
}
