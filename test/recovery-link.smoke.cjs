const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsxRuntime = require('react/jsx-runtime');
const source = fs.readFileSync(require.resolve('../components/AccountRecovery.tsx'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
function children(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(children)];
}
async function check(mode) {
  let index = 0, invalidCode = true;
  const slots = [], effects = [], requests = [];
  const state = { nextRouterState: true };
  const window = { location: { hash: '#token=obsolete-link', pathname: `/auth/${mode}`, search: '?source=email' },
    history: { state, replaceState(value, title, path) {
      assert.equal(value, state); assert.equal(path, `/auth/${mode}?source=email`); window.location.hash = '';
    } } };
  const context = { exports: {}, window, TextEncoder, require(name) {
    if (name === 'react') return {
      useState(initial) { const n = index++; if (!(n in slots)) slots[n] = initial;
        return [slots[n], value => { slots[n] = typeof value === 'function' ? value(slots[n]) : value; }]; },
      useEffect(effect) { effects.push(effect); },
    };
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name === '../lib/api') return { api: async (path, options) => {
      assert.equal(options.auth, false);
      const body = JSON.parse(options.body); requests.push({ path, body });
      if (path === '/auth/forgot-password') return { challengeId: 'c'.repeat(64), resendAfter: 60,
        message: 'If an eligible account exists, a 6-digit code will arrive shortly.' };
      if (path === '/auth/recovery-otp/verify') {
        assert.equal(body.challengeId, 'c'.repeat(64)); assert.equal(body.code, '012345');
        if (invalidCode) throw Error('Invalid or expired code');
        return { resetToken: 'r'.repeat(64), message: 'Code verified. Choose your new password.' };
      }
      assert.equal(path, '/auth/reset-password');
      assert.equal(body.token, 'r'.repeat(64)); assert.equal(body.password, 'long-new-password-123');
      return { message: 'Password saved. Sign in; authenticator 2FA stays enabled.' };
    } };
    throw Error(`Unexpected import ${name}`);
  } };
  vm.runInNewContext(js, context);
  const render = () => { index = 0; return children(context.exports.default({ mode })); };
  const submit = async () => render().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  render(); effects[0](); effects[0]();
  assert.equal(window.location.hash, '');
  if (mode === 'verify-email') {
    assert(!render().some(n => n.type === 'form'));
    assert(render().some(n => n.type === 'a' && n.props.href === '/'));
    return;
  }
  render().find(n => n.type === 'input' && n.props.type === 'email').props.onChange({ target: { value: ' USER@example.com ' } });
  await submit();
  assert.equal(requests[0].body.email, 'user@example.com');
  let tree = render();
  assert(tree.some(n => n.type === 'input' && n.props.autoComplete === 'one-time-code'), 'email submit must show an OTP input');
  assert(!tree.some(n => n.type === 'input' && n.props.type === 'password'));
  assert(tree.some(n => n.type === 'button' && n.props.disabled && n.props.children === 'Resend code in 60s'));
  tree.find(n => n.type === 'input').props.onChange({ target: { value: '0x12345' } });
  await submit();
  assert(render().some(n => n.props?.role === 'alert'), 'wrong code keeps the OTP form with an error');
  invalidCode = false; await submit();
  tree = render();
  const fields = tree.filter(n => n.type === 'input' && n.props.type === 'password');
  assert.equal(fields.length, 2, 'valid code reveals the password form');
  fields[0].props.onChange({ target: { value: 'long-new-password-123' } });
  fields[1].props.onChange({ target: { value: 'different-password' } });
  const before = requests.length; await submit();
  assert.equal(requests.length, before, 'mismatched passwords never reach the API');
  render().filter(n => n.type === 'input')[1].props.onChange({ target: { value: 'long-new-password-123' } });
  await submit();
  tree = render();
  assert(!tree.some(n => n.type === 'form'));
  assert(tree.some(n => n.type === 'a' && n.props.href === '/'));
  assert(!slots.includes('r'.repeat(64)), 'reset authorization is cleared after use');
  assert(!slots.includes('long-new-password-123'), 'password is cleared after use');
}
(async () => {
  for (const mode of ['recover-account', 'forgot-password', 'reset-password', 'resend-verification', 'verify-email']) await check(mode);
  console.log('PASS: all recovery pages show email → OTP → password → sign-in, wrong codes retain input, resend cooldown, password confirmation, memory-only reset authorization, and retired-link scrubbing.');
})().catch(error => { console.error(error); process.exitCode = 1; });
