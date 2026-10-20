const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');

const root = path.resolve(__dirname, '..');
loadEnvConfig(root, true);
const upstream = new URL(process.env.API_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4050/api/v1');
const children = new Set();
let stopping = false;

function start(file, args = [], options = {}) {
  const child = spawn(process.execPath, [file, ...args], {
    cwd: root, stdio: 'inherit', windowsHide: true, ...options,
  });
  children.add(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { children.delete(child); if (!stopping) stop(code || 0); });
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.connected) child.send({ type: 'shutdown' });
    else child.kill('SIGTERM');
  }
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

async function backendReady() {
  try {
    const response = await fetch(`${upstream.origin}/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch { return false; }
}

(async () => {
  if (['localhost', '127.0.0.1'].includes(upstream.hostname) && upstream.port === '4050' && !await backendReady()) {
    const backendRoot = path.resolve(root, '../trade-client-app');
    const entry = path.join(backendRoot, 'scripts/start-local.cjs');
    if (!existsSync(entry)) throw new Error('Local backend folder is missing. Start the backend separately or set API_BACKEND_URL.');
    console.log('Starting the local backend on port 4050…');
    const args = process.argv.slice(2);
    const portIndex = args.findIndex(arg => arg === '-p' || arg === '--port');
    const port = portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || '3000';
    start(entry, [], { cwd: backendRoot, stdio: ['inherit', 'inherit', 'inherit', 'ipc'], env: { ...process.env,
      LOCAL_FRONTEND_ORIGIN: process.env.LOCAL_FRONTEND_ORIGIN || `http://localhost:${port}` } });
    const deadline = Date.now() + 120000;
    while (!stopping && !await backendReady()) {
      if (Date.now() > deadline) throw new Error('Backend did not become ready. Check the backend output above for database or configuration errors.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  if (!stopping) start(require.resolve('next/dist/bin/next'), ['dev', ...process.argv.slice(2)]);
})().catch(error => { console.error(error.message); stop(1); });
