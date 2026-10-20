const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

(async () => {
  const source = fs.readFileSync(require.resolve('../lib/api.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  let csrfCalls = 0;
  let refreshCalls = 0;
  let validSession = false;
  let forceCsrfExpiry = false;
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({ url, init });
    assert(url.startsWith('/api/v1/'));
    assert.equal(init.credentials, 'same-origin');
    const headers = new Headers(init.headers);
    assert(!headers.has('authorization'));
    if (url.endsWith('/auth/csrf')) {
      csrfCalls++;
      return Response.json({ csrfToken: `csrf-${csrfCalls}` });
    }
    if (url.endsWith('/auth/refresh')) {
      refreshCalls++;
      assert(headers.has('x-csrf-token'));
      assert(!init.body, 'refresh credentials must come from HttpOnly cookies');
      await new Promise(resolve => setTimeout(resolve, 10));
      validSession = true;
      return Response.json({ expiresAt: 123 });
    }
    if (forceCsrfExpiry) {
      forceCsrfExpiry = false;
      return Response.json({ code: 'CSRF_INVALID' }, { status: 403 });
    }
    if (init.method === 'POST') assert(headers.has('x-csrf-token'));
    return validSession ? Response.json({ ok: true }) : new Response('', { status: 401 });
  };
  const context = { exports: {}, fetch, Headers, Response, navigator: {}, console, setTimeout };
  vm.runInNewContext(js, context);
  const { api } = context.exports;
  await Promise.all([api('/orders'), api('/rooftops'), api('/accounts')]);
  assert.equal(refreshCalls, 1, 'concurrent requests share one refresh');
  assert.equal(csrfCalls, 1);
  forceCsrfExpiry = true;
  await api('/orders', { method: 'POST', body: JSON.stringify({ lines: [] }) });
  assert.equal(csrfCalls, 2, 'expired CSRF token is renewed and request retried');
  const before = refreshCalls;
  validSession = false;
  await assert.rejects(api('/auth/login', { method: 'POST', auth: false, body: '{}' }));
  assert.equal(refreshCalls, before, 'failed login must not refresh an existing session');
  assert(!source.includes('localStorage'), 'API client must not access stored credentials');
  let unavailable = true;
  const retryContext = { ...context, exports: {}, fetch: async (url, init) => {
    if (url.endsWith('/auth/csrf') && unavailable) { unavailable = false; return new Response('', { status: 503 }); }
    if (url.endsWith('/auth/csrf')) return Response.json({ csrfToken: 'recovered-csrf-token' });
    return Response.json({ ok: true });
  } };
  vm.runInNewContext(js, retryContext);
  await assert.rejects(retryContext.exports.api('/auth/login', { method: 'POST', auth: false, body: '{}' }), /temporarily unavailable/);
  await retryContext.exports.api('/auth/login', { method: 'POST', auth: false, body: '{}' });
  console.log('PASS: first-party requests, CSRF headers and renewal, shared refresh, cookie-only refresh credentials, and no bearer tokens or localStorage.');
})().catch(error => { console.error(error); process.exitCode = 1; });
