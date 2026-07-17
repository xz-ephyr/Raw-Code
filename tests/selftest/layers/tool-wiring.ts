import type { SelfTestResult, LayerManifest } from '../types';

function ok(layer: string, name: string): SelfTestResult {
  return { layer, name, status: 'pass', durationMs: 0 };
}
function fail(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs: 0 };
}

async function checkRegisterGlobal(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { registerGlobal, registerGlobalBatch, listGlobal, clearGlobal } = await import('@doktor/tool-runtime');
    const { make } = await import('@doktor/tool-runtime/tool/make');
    const testTool = make({
      description: 'test tool',
      input: { _tag: 'Struct', fields: {} },
      output: { _tag: 'Struct', fields: {} },
      execute: () => Promise.resolve({ ok: true }),
    });
    registerGlobal('test_selftest_tool', testTool, 'builtin');
    const globalEntries = listGlobal();
    if (globalEntries.has('test_selftest_tool')) {
      results.push(ok(layer, 'registerGlobal + listGlobal: tool registered'));
    } else {
      results.push(fail(layer, 'registerGlobal + listGlobal', 'Tool not found in global registry'));
    }
    registerGlobalBatch({ test_selftest_batch: testTool }, 'content');
    const updated = listGlobal();
    if (updated.has('test_selftest_batch')) {
      results.push(ok(layer, 'registerGlobalBatch: tool registered'));
    } else {
      results.push(fail(layer, 'registerGlobalBatch', 'Tool not found in global registry'));
    }
    clearGlobal();
    const afterClear = listGlobal();
    if (afterClear.size === 0) {
      results.push(ok(layer, 'clearGlobal: registry cleared'));
    } else {
      results.push(fail(layer, 'clearGlobal', `Registry has ${afterClear.size} entries after clear`));
    }
  } catch (e) {
    results.push(fail(layer, 'Global registry', String(e)));
  }
  return results;
}

async function checkMaterialize(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { materialize, clearAllRegistrations } = await import('@doktor/tool-runtime');
    const { make } = await import('@doktor/tool-runtime/tool/make');
    const { registerGlobal } = await import('@doktor/tool-runtime');

    const testTool = make({
      description: 'materialize test',
      input: { _tag: 'Struct', fields: { x: { _tag: 'String' } } },
      output: { _tag: 'Struct', fields: { y: { _tag: 'String' } } },
      execute: () => Promise.resolve({ y: 'hello' }),
    });
    registerGlobal('mat_test', testTool, 'builtin');

    const mat = materialize();
    if (mat.definitions.length > 0) {
      results.push(ok(layer, 'materialize: returns definitions'));
    } else {
      results.push(fail(layer, 'materialize: returns definitions', 'definitions is empty'));
    }
    if (mat.definitionsMap instanceof Map) {
      results.push(ok(layer, 'materialize: returns definitionsMap'));
    }
    if (typeof mat.settle === 'function') {
      results.push(ok(layer, 'materialize: settle is a function'));
    }

    const filtered = materialize({ filterByScope: ['mat_test'] });
    if (filtered.definitions.every((d) => d.name === 'mat_test')) {
      results.push(ok(layer, 'materialize: filterByScope works'));
    } else {
      results.push(fail(layer, 'materialize: filterByScope', `Got ${filtered.definitions.map(d => d.name).join(',')}`));
    }

    clearAllRegistrations();
    const afterClear = materialize();
    if (afterClear.definitions.length === 0) {
      results.push(ok(layer, 'clearAllRegistrations: empty after clear'));
    } else {
      results.push(fail(layer, 'clearAllRegistrations', `${afterClear.definitions.length} entries remain`));
    }
  } catch (e) {
    results.push(fail(layer, 'Materialize', String(e)));
  }
  return results;
}

async function checkToolOutputStore(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { putToolOutput, getToolOutput, listSessionOutputs, clearSessionOutputs } = await import('@doktor/tool-runtime');
    putToolOutput('session_a', 'call_1', 'test_tool', { arg: 1 }, { result: 'ok' });
    const entry = getToolOutput('session_a', 'call_1');
    if (entry && entry.toolName === 'test_tool') {
      results.push(ok(layer, 'ToolOutputStore: put + get'));
    } else {
      results.push(fail(layer, 'ToolOutputStore: put + get', `Got ${JSON.stringify(entry)}`));
    }
    const list = listSessionOutputs('session_a');
    if (list.length >= 1) {
      results.push(ok(layer, 'ToolOutputStore: listSessionOutputs'));
    }
    clearSessionOutputs('session_a');
    const afterClear = listSessionOutputs('session_a');
    if (afterClear.length === 0) {
      results.push(ok(layer, 'ToolOutputStore: clearSessionOutputs'));
    }
  } catch (e) {
    results.push(fail(layer, 'ToolOutputStore', String(e)));
  }
  return results;
}

async function checkDeferredPattern(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { registerDeferred, hasPendingDeferred, resolveDeferred, clearSessionDeferreds } = await import('@doktor/tool-runtime');

    // We can't easily test the full Deferred flow without Effect runtime,
    // but we can test the bookkeeping functions
    const df = await import('effect');
    const d = df.Deferred.unsafeMake<number>(df.Effect.runFork);
    registerDeferred('session_df', 'call_df', d);
    if (hasPendingDeferred('session_df', 'call_df')) {
      results.push(ok(layer, 'Deferred: registerDeferred + hasPendingDeferred'));
    } else {
      results.push(fail(layer, 'Deferred: registerDeferred + hasPendingDeferred', 'Deferred not found'));
    }
    clearSessionDeferreds('session_df');
    if (!hasPendingDeferred('session_df', 'call_df')) {
      results.push(ok(layer, 'Deferred: clearSessionDeferreds'));
    } else {
      results.push(fail(layer, 'Deferred: clearSessionDeferreds', 'Deferred still present after clear'));
    }
  } catch (e) {
    results.push(fail(layer, 'Deferred pattern', String(e)));
  }
  return results;
}

async function checkContentToolsRegistered(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { registerContentTools, clearAllRegistrations } = await import('@doktor/tool-runtime');
    const { materialize } = await import('@doktor/tool-runtime');
    registerContentTools();
    const mat = materialize();
    const expectedTools = ['question', 'research', 'web_search', 'write_article', 'edit_text',
      'generate_script', 'crawl_website', 'map_site', 'extract_videos', 'scrape_url',
      'extract_images', 'extract_structured', 'research_compile', 'crawl_to_articles',
      'import_video_sources', 'render_video', 'edit_video', 'export_video', 'preview_video',
      'poll_render_job', 'create_plan', 'execute_plan', 'plan_templates'];
    const found = mat.definitions.map((d) => d.name);
    const missing = expectedTools.filter((t) => !found.includes(t));
    if (missing.length === 0) {
      results.push(ok(layer, `registerContentTools: all ${expectedTools.length} tools registered`));
    } else {
      results.push(fail(layer, 'registerContentTools', `Missing tools: ${missing.join(', ')}`));
    }
    clearAllRegistrations();
  } catch (e) {
    results.push(fail(layer, 'Content tools registration', String(e)));
  }
  return results;
}

export const toolWiringManifest: LayerManifest = {
  id: 'tool-wiring',
  name: 'Tool Wiring',
  description: 'Verify tool registration, materialization, store, deferred pattern, content tools',
  requiresFull: true,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkRegisterGlobal('tool-wiring'),
      ...await checkMaterialize('tool-wiring'),
      ...await checkToolOutputStore('tool-wiring'),
      ...await checkDeferredPattern('tool-wiring'),
      ...await checkContentToolsRegistered('tool-wiring'),
    ];
    return results;
  },
};
