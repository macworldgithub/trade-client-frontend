const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsxRuntime = require('react/jsx-runtime');

const source = fs.readFileSync(require.resolve('../components/AccountRecovery.tsx'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function children(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(children)];
}

async function check(mode, hash) {
  let index = 0;
  const slots = [];
  const effects = [];
  const requests = [];
  const state = { nextRouterState: true };
  const window = {
    location: { hash, pathname: `/auth/${mode}`, search: '?source=email' },
    history: { state, replaceState(value, title, path) {
      assert.equal(value, state, 'Next router state must be preserved');
      assert.equal(path, `/auth/${mode}?source=email`);
      window.location.hash = '';
    } },
  };
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], value => { slots[slot] = value; }];
    },
    useRef(initial) {
      const slot = index++;
      return slots[slot] ||= { current: initial };
    },
    useEffect(effect) { effects.push(effect); },
  };
  const context = { exports: {}, window, URLSearchParams, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name === '../lib/api') return { api: async (path, options) => { requests.push({ path, body: JSON.parse(options.body) }); return { message: 'Success' }; } };
    throw new Error(`Unexpected import ${name}`);
  } };
  vm.runInNewContext(js, context);
  const render = () => { index = 0; return context.exports.default({ mode }); };
  render();
  effects[0]();
  effects[0](); // React StrictMode's effect replay after the fragment was scrubbed.
  const nodes = children(render());
  const button = nodes.find(node => node.type === 'button');
  const needsToken = mode === 'reset-password' || mode === 'verify-email';
  assert.equal(button.props.disabled, needsToken && !hash);
  if (hash) {
    assert.equal(slots[0], 'a'.repeat(64));
    await nodes.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.token, 'a'.repeat(64));
  } else if (needsToken) {
    await nodes.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(requests.length, 0, 'missing token must never be submitted');
  } else {
    nodes.find(node => node.type === 'input' && node.props.type === 'email').props.onChange({ target: { value: 'user@example.com' } });
    await children(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/auth/forgot-password', 'all account recovery entry points must request one combined link');
    assert.equal(requests[0].body.email, 'user@example.com');
  }
}

(async () => {
  await check('reset-password', `#token=${'a'.repeat(64)}`);
  await check('verify-email', `#token=${'a'.repeat(64)}`);
  await check('reset-password', '');
  await check('recover-account', '');
  await check('forgot-password', '');
  await check('resend-verification', '');
  console.log('PASS: reset and verification tokens survive StrictMode effect replay, URL fragments are scrubbed, router state is preserved, and missing links cannot submit.');
})().catch(error => { console.error(error); process.exitCode = 1; });
