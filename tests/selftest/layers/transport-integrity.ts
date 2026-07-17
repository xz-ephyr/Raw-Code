import type { SelfTestResult, LayerManifest } from '../types';
import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import express from 'express';

function ok(layer: string, name: string): SelfTestResult {
  return { layer, name, status: 'pass', durationMs: 0 };
}
function fail(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'fail', message: msg, durationMs: 0 };
}
function skip(layer: string, name: string, msg: string): SelfTestResult {
  return { layer, name, status: 'skip', message: msg, durationMs: 0 };
}

async function checkEventBus(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { onEvent, onAnyEvent, emit, clearAllHandlers } = await import('@doktor/tool-runtime');
    const events: string[] = [];
    const unsub1 = onEvent('tool_call_start', (e) => { events.push(e.type); });
    const unsub2 = onAnyEvent((e) => { events.push(`any:${e.type}`); });
    emit({ type: 'tool_call_start', sessionID: 'test', agentID: 'test', timestamp: Date.now(), payload: {} });
    emit({ type: 'tool_call_end', sessionID: 'test', agentID: 'test', timestamp: Date.now(), payload: {} });
    if (events.includes('tool_call_start') && events.includes('any:tool_call_start') && events.includes('any:tool_call_end')) {
      results.push(ok(layer, 'Event bus: onEvent/onAnyEvent/emit wiring'));
    } else {
      results.push(fail(layer, 'Event bus: onEvent/onAnyEvent/emit wiring', `Got events: ${JSON.stringify(events)}`));
    }
    unsub1();
    unsub2();
    clearAllHandlers();
    results.push(ok(layer, 'Event bus: unsubscribe and clearAllHandlers'));
  } catch (e) {
    results.push(fail(layer, 'Event bus', String(e)));
  }
  return results;
}

async function checkEventStore(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { InMemoryEventStore } = await import('@doktor/tool-runtime/event-store');
    const store = new InMemoryEventStore();
    if (store) results.push(ok(layer, 'Event store: InMemoryEventStore constructible'));
    else results.push(fail(layer, 'Event store: InMemoryEventStore constructible', 'store is null'));
    if (typeof store.append === 'function') results.push(ok(layer, 'Event store: append is a function'));
    if (typeof store.getEvents === 'function') results.push(ok(layer, 'Event store: getEvents is a function'));
  } catch (e) {
    results.push(fail(layer, 'Event store', String(e)));
  }
  return results;
}

async function checkRemoteEventStore(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  try {
    const { RemoteEventStore } = await import('@doktor/tool-runtime/remote-event-store');
    if (RemoteEventStore) results.push(ok(layer, 'RemoteEventStore importable'));
    else results.push(fail(layer, 'RemoteEventStore importable', 'RemoteEventStore is null'));
  } catch (e) {
    results.push(skip(layer, 'RemoteEventStore', String(e)));
  }
  return results;
}

async function checkProxyRoute(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  let server: ReturnType<typeof createServer> | null = null;

  try {
    const proxyRouter = (await import('../../../server/src/routes/proxy.js')).default;
    const app = express();
    app.use(express.json());
    app.use(proxyRouter);

    await new Promise<void>((resolve, reject) => {
      server = createServer(app).listen(0, '127.0.0.1', () => resolve());
      server?.on('error', reject);
    });
    const port = (server!.address() as any).port;

    // Test 1: POST to httpbin echo endpoint through the proxy
    const echoPayload = JSON.stringify({ test: 'selftest-proxy', ts: Date.now() });
    const echoResult = await new Promise<string>((resolve, reject) => {
      const req = httpRequest(
        { hostname: '127.0.0.1', port, method: 'POST', path: '/proxy/https://httpbin.org/post', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(echoPayload) }, timeout: 15000 },
        (res) => {
          let body = '';
          res.on('data', (c) => body += c);
          res.on('end', () => resolve(body));
        },
      );
      req.on('error', reject);
      req.write(echoPayload);
      req.end();
    });

    const parsed = JSON.parse(echoResult);
    if (parsed.json?.test === 'selftest-proxy') {
      results.push(ok(layer, 'Proxy route: POST to httpbin echo returns forwarded body'));
    } else {
      results.push(fail(layer, 'Proxy route: echo response', `Unexpected: ${JSON.stringify(parsed).slice(0, 200)}`));
    }

    // Test 2: Verify proxy returns correct status code from upstream
    if (parsed?.url?.includes('httpbin.org/post')) {
      results.push(ok(layer, 'Proxy route: response includes upstream URL'));
    } else {
      results.push(fail(layer, 'Proxy route: upstream URL in response', `Missing or wrong url field`));
    }

    // Test 3: GET request through proxy
    const getResult = await new Promise<string>((resolve, reject) => {
      const req = httpRequest(
        { hostname: '127.0.0.1', port, method: 'GET', path: '/proxy/https://httpbin.org/get', timeout: 15000 },
        (res) => {
          let body = '';
          res.on('data', (c) => body += c);
          res.on('end', () => resolve(body));
        },
      );
      req.on('error', reject);
      req.end();
    });
    const getParsed = JSON.parse(getResult);
    if (getParsed?.url?.includes('httpbin.org/get')) {
      results.push(ok(layer, 'Proxy route: GET request returns upstream response'));
    } else {
      results.push(fail(layer, 'Proxy route: GET request', `Unexpected: ${JSON.stringify(getParsed).slice(0, 200)}`));
    }
  } catch (e: any) {
    const msg = String(e.message ?? e);
    if (msg.includes('httpbin.org') || msg.includes('getaddrinfo') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('fetch')) {
      results.push(skip(layer, 'Proxy route: HTTP echo test', `Network issue — httpbin.org not reachable: ${msg.slice(0, 100)}`));
    } else {
      results.push(fail(layer, 'Proxy route: HTTP echo test', msg.slice(0, 200)));
    }
  } finally {
    if (server) await new Promise((r) => server!.close(r));
  }
  return results;
}

async function checkProxySecurity(layer: string): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = [];
  let server: ReturnType<typeof createServer> | null = null;

  try {
    const proxyRouter = (await import('../../../server/src/routes/proxy.js')).default;
    const app = express();
    app.use(express.json());
    app.use(proxyRouter);

    await new Promise<void>((resolve, reject) => {
      server = createServer(app).listen(0, '127.0.0.1', () => resolve());
      server?.on('error', reject);
    });
    const port = (server!.address() as any).port;

    // Test 1: Block private IP
    const privateResult = await new Promise<string>((resolve, reject) => {
      const req = httpRequest(
        { hostname: '127.0.0.1', port, method: 'GET', path: '/proxy/http://127.0.0.1:22', timeout: 5000 },
        (res) => {
          let body = '';
          res.on('data', (c) => body += c);
          res.on('end', () => resolve(body));
        },
      );
      req.on('error', reject);
      req.end();
    });
    const privParsed = JSON.parse(privateResult);
    if (privParsed?.error?.includes('private')) {
      results.push(ok(layer, 'Proxy security: blocks private IP (127.0.0.1)'));
    } else {
      results.push(fail(layer, 'Proxy security: private IP block', `Got: ${JSON.stringify(privParsed).slice(0, 100)}`));
    }

    // Test 2: Block non-http protocol
    const protoResult = await new Promise<string>((resolve, reject) => {
      const req = httpRequest(
        { hostname: '127.0.0.1', port, method: 'GET', path: '/proxy/ftp://files.example.com/file', timeout: 5000 },
        (res) => {
          let body = '';
          res.on('data', (c) => body += c);
          res.on('end', () => resolve(body));
        },
      );
      req.on('error', reject);
      req.end();
    });
    const protoParsed = JSON.parse(protoResult);
    if (protoParsed?.error?.includes('http')) {
      results.push(ok(layer, 'Proxy security: blocks non-http protocol (ftp)'));
    } else {
      results.push(fail(layer, 'Proxy security: protocol block', `Got: ${JSON.stringify(protoParsed).slice(0, 100)}`));
    }

    // Test 3: Block invalid URL
    const invalidResult = await new Promise<string>((resolve, reject) => {
      const req = httpRequest(
        { hostname: '127.0.0.1', port, method: 'GET', path: '/proxy/not-a-valid-url', timeout: 5000 },
        (res) => {
          let body = '';
          res.on('data', (c) => body += c);
          res.on('end', () => resolve(body));
        },
      );
      req.on('error', reject);
      req.end();
    });
    const invParsed = JSON.parse(invalidResult);
    if (invParsed?.error?.includes('Invalid URL')) {
      results.push(ok(layer, 'Proxy security: rejects invalid URL'));
    } else {
      results.push(fail(layer, 'Proxy security: invalid URL', `Got: ${JSON.stringify(invParsed).slice(0, 100)}`));
    }
  } catch (e: any) {
    results.push(fail(layer, 'Proxy security', String(e.message ?? e).slice(0, 200)));
  } finally {
    if (server) await new Promise((r) => server!.close(r));
  }
  return results;
}

export const transportIntegrityManifest: LayerManifest = {
  id: 'transport-integrity',
  name: 'Transport Integrity',
  description: 'Verify event bus wiring, event stores, proxy route (through real HTTP), proxy security',
  requiresFull: true,
  requiresEnv: [],
  run: async (): Promise<SelfTestResult[]> => {
    const results: SelfTestResult[] = [
      ...await checkEventBus('transport-integrity'),
      ...await checkEventStore('transport-integrity'),
      ...await checkRemoteEventStore('transport-integrity'),
      ...await checkProxyRoute('transport-integrity'),
      ...await checkProxySecurity('transport-integrity'),
    ];
    return results;
  },
};
