const assert = require('node:assert/strict');
const http = require('node:http');
const next = require('next');

// Isolate Next's dev watchers so the parent can clean up the entire test process
// without invoking the Windows libuv watcher-shutdown path.
if (!process.env.TRADE_PROXY_TEST_WORKER) {
  const { spawn } = require('node:child_process');
  const child = spawn(process.execPath, [__filename], {
    env: { ...process.env, TRADE_PROXY_TEST_WORKER: '1' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let passed = false;
  const timeout = setTimeout(() => { child.kill(); }, 45000);
  child.stdout.on('data', data => {
    process.stdout.write(data);
    if (data.toString().includes('PASS: actual Next.js proxy')) { passed = true; child.kill(); }
  });
  child.stderr.on('data', data => process.stderr.write(data));
  child.on('error', error => { console.error(error); clearTimeout(timeout); process.exitCode = 1; });
  child.on('close', () => { clearTimeout(timeout); process.exitCode = passed ? 0 : 1; });
} else {
(async () => {
  let upstream;
  let frontend;
  let app;
  try {
    upstream = http.createServer((req, res) => {
      assert.equal(req.url, '/api/v1/auth/refresh');
      assert.equal(req.headers.cookie, 'trade_refresh=private-refresh');
      assert.equal(req.headers['x-csrf-token'], 'csrf-test');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Set-Cookie', [
        'trade_access=access; Path=/; HttpOnly; Secure; SameSite=Lax',
        'trade_refresh=refresh; Path=/; HttpOnly; Secure; SameSite=Lax',
      ]);
      res.end(JSON.stringify({ expiresAt: 123 }));
    });
    await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
    process.env.API_BACKEND_URL = `http://127.0.0.1:${upstream.address().port}/api/v1`;
    app = next({ dev: true, hostname: '127.0.0.1' });
    await app.prepare();
    frontend = http.createServer(app.getRequestHandler());
    await new Promise(resolve => frontend.listen(0, '127.0.0.1', resolve));
    const response = await fetch(`http://127.0.0.1:${frontend.address().port}/api/v1/auth/refresh`, {
      method: 'POST', headers: { Cookie: 'trade_refresh=private-refresh', 'X-CSRF-Token': 'csrf-test' },
    });
    assert.equal(response.status, 200);
    const cookies = response.headers.getSetCookie();
    assert.equal(cookies.length, 2);
    assert(cookies.every(cookie => /HttpOnly/i.test(cookie) && /Secure/i.test(cookie) && !/Domain=/i.test(cookie)));
    assert.deepEqual(await response.json(), { expiresAt: 123 });
    const home = await fetch(`http://127.0.0.1:${frontend.address().port}/`);
    assert.equal(home.status, 200, 'homepage must remain available alongside the proxy');
    const html = await home.text();
    const css = html.match(/href="([^"]*\/_next\/static\/css\/[^\"]+)"/);
    assert(css, 'homepage must reference a generated stylesheet');
    const stylesheet = await fetch(new URL(css[1].replaceAll('&amp;', '&'), `http://127.0.0.1:${frontend.address().port}`));
    assert.equal(stylesheet.status, 200, 'generated stylesheet must be available');
    console.log('PASS: actual Next.js proxy forwards cookies and CSRF headers and preserves multiple host-only HttpOnly Set-Cookie headers.');
  } finally {
    if (frontend) await new Promise(resolve => frontend.close(resolve));
    // Next 14 dev watcher shutdown can double-close libuv handles on Windows.
    // This standalone test closes its HTTP servers and exits its own process.
    if (upstream) await new Promise(resolve => upstream.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
}
