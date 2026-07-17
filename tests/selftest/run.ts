import { cac } from 'cac';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LayerManifest, SelfTestResult } from './types';
import { runLayer, buildScorecard, emitScorecard, exitCode, summarize } from './runner';
import { configSanityManifest } from './layers/config-sanity';
import { authManifest } from './layers/auth';
import { requestConformanceManifest } from './layers/request-conformance';
import { transportIntegrityManifest } from './layers/transport-integrity';
import { reasoningSeparationManifest } from './layers/reasoning-separation';
import { toolWiringManifest } from './layers/tool-wiring';
import { subagentOrchestrationManifest } from './layers/subagent-orchestration';
import { endToEndManifest } from './layers/end-to-end';
import { uiSmokeManifest } from './layers/ui-smoke';
import { modeDefaultManifest } from './layers/mode-default';
import { modeTeamworkManifest } from './layers/mode-teamwork';
import { modeAntigravityManifest } from './layers/mode-antigravity';
import { modeCrossManifest } from './layers/mode-cross';
import { teamworkRealTasksManifest } from './layers/teamwork-real-tasks';
import { modeDefaultRealManifest } from './layers/mode-default-real';

const ALL_MANIFESTS: LayerManifest[] = [
  configSanityManifest,
  authManifest,
  requestConformanceManifest,
  transportIntegrityManifest,
  reasoningSeparationManifest,
  toolWiringManifest,
  subagentOrchestrationManifest,
  endToEndManifest,
  uiSmokeManifest,
  modeDefaultManifest,
  modeTeamworkManifest,
  modeAntigravityManifest,
  modeCrossManifest,
  modeDefaultRealManifest,
  teamworkRealTasksManifest,
];

const cli = cac('selftest');

cli.option('--full', 'Run all layers including those requiring real API keys (auth, transport, subagent, e2e)');
cli.option('--layer <id>', 'Run only a specific layer by id (repeatable)');
cli.option('--list', 'List available layers and exit');
cli.help();

const parsed = cli.parse();

async function main() {
  if (parsed.options.list) {
    console.log('Available layers:');
    console.log(summarize(ALL_MANIFESTS));
    process.exit(0);
  }

  const full = parsed.options.full as boolean;
  const filterLayers = parsed.options.layer
    ? (Array.isArray(parsed.options.layer) ? parsed.options.layer : [parsed.options.layer])
    : null;

  const manifests = filterLayers
    ? ALL_MANIFESTS.filter((m) => filterLayers!.includes(m.id))
    : ALL_MANIFESTS;

  if (manifests.length === 0) {
    console.error(`No layers matched. Use --list to see available layers.`);
    process.exit(1);
  }

  const _rDirname = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(_rDirname, '..', '..', 'package.json'), 'utf-8'));
  console.log(`Self-Test Harness v${pkg.version || 'dev'}`);
  console.log(`Mode: ${full ? 'FULL' : 'QUICK (use --full for API-dependent layers)'}`);
  console.log(`Layers: ${manifests.map((m) => m.id).join(', ')}`);
  console.log();

  const allResults: SelfTestResult[] = [];
  const overallStart = Date.now();

  for (const manifest of manifests) {
    process.stdout.write(`  ${manifest.id}: ${manifest.name} ... `);
    const layerStart = Date.now();
    const { results, duration } = await runLayer(manifest, full);
    allResults.push(...results);
    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    const skipped = results.filter((r) => r.status === 'skip').length;
    const status = failed > 0 ? '❌ FAIL' : skipped > 0 ? '⏭️  SKIP' : '✅ PASS';
    console.log(`${status}  (${duration}ms, ${passed}p/${failed}f/${skipped}s)`);
  }

  const totalDuration = Date.now() - overallStart;
  const scorecard = buildScorecard(allResults, totalDuration);
  console.log();
  console.log(`Total: ${scorecard.summary.passed}p / ${scorecard.summary.failed}f / ${scorecard.summary.skipped}s  (${totalDuration}ms)`);

  emitScorecard(scorecard);
  process.exit(exitCode(scorecard));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
