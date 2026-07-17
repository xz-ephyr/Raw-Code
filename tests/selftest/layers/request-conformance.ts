import type { SelfTestResult, LayerManifest } from '../types';

function ok(layer: string, name: string): SelfTestResult {
  return { layer, name, status: 'pass', durationMs: 0 };
}
function fail(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs: 0 };
}

async function checkSanitizeConfig(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { PROVIDER_SANITIZE_CONFIG } = await import('@doktor/llm-providers/providers/sanitize-config');
    const providers = Object.keys(PROVIDER_SANITIZE_CONFIG);
    if (providers.length > 0) {
      results.push(ok(layer, `PROVIDER_SANITIZE_CONFIG has ${providers.length} entries: ${providers.join(', ')}`));
    } else {
      results.push(fail(layer, 'PROVIDER_SANITIZE_CONFIG entries', 'No provider configs found'));
    }
    for (const p of providers) {
      const cfg = PROVIDER_SANITIZE_CONFIG[p];
      if (cfg.deleteFields && cfg.deleteFields.length > 0) {
        results.push(ok(layer, `${p}: ${cfg.deleteFields.length} deleteFields`));
      } else {
        results.push(ok(layer, `${p}: no deleteFields (uses defaults)`));
      }
      if (cfg.convertJsonSchemaToJsonObject !== undefined) {
        results.push(ok(layer, `${p}: convertJsonSchemaToJsonObject = ${cfg.convertJsonSchemaToJsonObject}`));
      } else {
        results.push(ok(layer, `${p}: convertJsonSchemaToJsonObject = true (default)`));
      }
      if (cfg.modelMap) {
        const keys = Object.keys(cfg.modelMap);
        results.push(ok(layer, `${p}: modelMap has ${keys.length} entries`));
      }
    }
  } catch (e) {
    results.push(fail(layer, 'import PROVIDER_SANITIZE_CONFIG', String(e)));
  }
  return results;
}

async function checkModelRoutes(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { FRONTEND_MODELS } = await import('@doktor/llm-providers/providers/model-routes');
    if (FRONTEND_MODELS && FRONTEND_MODELS.length > 0) {
      results.push(ok(layer, `FRONTEND_MODELS has ${FRONTEND_MODELS.length} entries`));
      for (const m of FRONTEND_MODELS) {
        if (m.id && m.provider) {
          results.push(ok(layer, `FRONTEND_MODELS entry: ${m.id} (${m.provider})`));
        } else {
          results.push(fail(layer, `FRONTEND_MODELS entry ${m.id ?? 'unnamed'}`, 'Missing id or provider'));
        }
      }
    } else {
      results.push(fail(layer, 'FRONTEND_MODELS', 'No frontend models defined'));
    }
  } catch (e) {
    results.push(fail(layer, 'import FRONTEND_MODELS', String(e)));
  }
  return results;
}

async function checkModelRoutesProvider(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { ModelRoutesProvider } = await import('@doktor/llm-providers');
    const { allRoutes, getRouteByModelId } = ModelRoutesProvider;
    if (allRoutes && allRoutes.length > 0) {
      results.push(ok(layer, `ModelRoutesProvider.allRoutes has ${allRoutes.length} routes`));
    } else {
      results.push(fail(layer, 'ModelRoutesProvider.allRoutes', 'No routes available'));
    }
    if (typeof getRouteByModelId === 'function') {
      results.push(ok(layer, 'ModelRoutesProvider.getRouteByModelId is a function'));
    } else {
      results.push(fail(layer, 'ModelRoutesProvider.getRouteByModelId', 'Not a function'));
    }
  } catch (e) {
    results.push(fail(layer, 'import ModelRoutesProvider', String(e)));
  }
  return results;
}

export const requestConformanceManifest: LayerManifest = {
  id: 'request-conformance',
  name: 'Request Conformance',
  description: 'Verify provider sanitize configs, model routes, and request shaping patterns',
  requiresFull: false,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkSanitizeConfig('request-conformance'),
      ...await checkModelRoutes('request-conformance'),
      ...await checkModelRoutesProvider('request-conformance'),
    ];
    return results;
  },
};
