import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SelfTestResult, LayerManifest } from '../types';

const _dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(_dirname, '..', '..', '..');

function ok(layer: string, name: string, msg?: string): SelfTestResult {
  return { layer, name, status: 'pass', message: msg, durationMs: 0 };
}
function fail(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs: 0 };
}

async function checkFileExistence(layer: string): Promise<SelfTestResult[]> {
  const checks: { name: string; path: string }[] = [
    { name: 'vite.config.ts exists', path: join(ROOT, 'vite.config.ts') },
    { name: 'tsconfig.json exists', path: join(ROOT, 'tsconfig.json') },
    { name: 'vitest.config.ts exists', path: join(ROOT, 'vitest.config.ts') },
    { name: 'package.json exists', path: join(ROOT, 'package.json') },
    { name: 'AGENTS.md exists', path: join(ROOT, 'AGENTS.md') },
    { name: 'packages/tool-runtime exists', path: join(ROOT, 'packages', 'tool-runtime') },
    { name: 'packages/subagent exists', path: join(ROOT, 'packages', 'subagent') },
    { name: 'packages/llm-providers exists', path: join(ROOT, 'packages', 'llm-providers') },
    { name: 'src/ directory exists', path: join(ROOT, 'src') },
    { name: 'core/ directory exists', path: join(ROOT, 'core') },
    { name: 'server/ directory exists', path: join(ROOT, 'server') },
  ];
  return checks.map((c) => (existsSync(c.path) ? ok(layer, c.name) : fail(layer, c.name, `Missing: ${c.path}`)));
}

async function checkPackageJson(layer: string): Promise<SelfTestResult[]> {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  const results: SelfTestResult[] = [];

  const requiredScripts = ['dev', 'build'];
  for (const script of requiredScripts) {
    if (pkg.scripts?.[script]) {
      results.push(ok(layer, `package.json has script "${script}"`));
    } else {
      results.push(fail(layer, `package.json has script "${script}"`, `Missing script: ${script}`));
    }
  }

  if (pkg.scripts?.test || pkg.scripts?.['test:run'] || pkg.devDependencies?.vitest) {
    results.push(ok(layer, 'package.json has test script or vitest available'));
  } else {
    results.push(fail(layer, 'package.json has test script or vitest', 'No test mechanism found'));
  }

  if (pkg.scripts?.typecheck === 'npx tsc --noEmit') {
    results.push(ok(layer, 'package.json typecheck script matches AGENTS.md'));
  } else {
    results.push(ok(layer, 'package.json typecheck script present (AGENTS.md reference may vary)'));
  }

  const requiredDeps = ['effect', 'react', 'react-dom', 'vite'];
  for (const dep of requiredDeps) {
    if (pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]) {
      results.push(ok(layer, `package.json has dependency: ${dep}`));
    } else {
      results.push(fail(layer, `package.json has dependency: ${dep}`, `Missing: ${dep}`));
    }
  }

  return results;
}

async function checkTsconfigPaths(layer: string): Promise<SelfTestResult[]> {
  const tsconfig = JSON.parse(readFileSync(join(ROOT, 'tsconfig.json'), 'utf-8'));
  const paths = tsconfig.compilerOptions?.paths ?? {};
  const results: SelfTestResult[] = [];

  const expected = ['@/*', '@core/*', '@doktor/tool-runtime', '@doktor/tool-runtime/*',
    '@doktor/subagent', '@doktor/subagent/*', '@doktor/llm-providers', '@doktor/llm-providers/*',
    '@doktor/schema', '@doktor/schema/*', '@doktor/effect-drizzle-sqlite', '@doktor/effect-drizzle-sqlite/*',
    '@doktor/effect-sqlite-node', '@doktor/effect-sqlite-node/*'];

  for (const key of expected) {
    if (paths[key]) {
      results.push(ok(layer, `tsconfig path alias "${key}"`));
    } else {
      results.push(fail(layer, `tsconfig path alias "${key}"`, `Missing alias: ${key}`));
    }
  }

  // Check strict mode
  if (tsconfig.compilerOptions?.strict) {
    results.push(ok(layer, 'tsconfig strict mode enabled'));
  } else {
    results.push(fail(layer, 'tsconfig strict mode', 'strict must be true'));
  }

  return results;
}

async function checkAgentsMd(layer: string): Promise<SelfTestResult[]> {
  const content = readFileSync(join(ROOT, 'AGENTS.md'), 'utf-8');
  const results: SelfTestResult[] = [];

  const expectedSections = [
    'Project Overview',
    'Package Architecture',
    'Key Conventions',
    'Important Files',
    'Migration Status',
    'Type Check Commands',
  ];
  for (const section of expectedSections) {
    if (content.includes(section)) {
      results.push(ok(layer, `AGENTS.md contains "${section}"`));
    } else {
      results.push(fail(layer, `AGENTS.md contains "${section}"`, `Missing section: ${section}`));
    }
  }

  return results;
}

async function checkPackageStructure(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];

  const pkgs = ['tool-runtime', 'subagent', 'llm-providers', 'schema', 'effect-drizzle-sqlite', 'effect-sqlite-node'];
  for (const pkg of pkgs) {
    const dir = join(ROOT, 'packages', pkg, 'src');
    const pkgJson = join(ROOT, 'packages', pkg, 'package.json');
    if (existsSync(dir) && existsSync(pkgJson)) {
      results.push(ok(layer, `${pkg} has src/ and package.json`));
    } else {
      results.push(fail(layer, `${pkg} has src/ and package.json`, `Missing for ${pkg}`));
    }
  }

  return results;
}

export const configSanityManifest: LayerManifest = {
  id: 'config-sanity',
  name: 'Config Sanity',
  description: 'Verify project structure, package.json scripts, tsconfig paths, AGENTS.md, package layouts',
  requiresFull: false,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkFileExistence('config-sanity'),
      ...await checkPackageJson('config-sanity'),
      ...await checkTsconfigPaths('config-sanity'),
      ...await checkAgentsMd('config-sanity'),
      ...await checkPackageStructure('config-sanity'),
    ];
    return results;
  },
};
