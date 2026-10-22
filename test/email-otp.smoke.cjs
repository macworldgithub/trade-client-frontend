const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsxRuntime = require('react/jsx-runtime');
const source = fs.readFileSync(require.resolve('../components/LoginPage.tsx'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
}

(async () => {
  for (const signup of [false, true]) {
    let index = 0, verified = 0, registered = 0, loggedIn = 0;
    const slots = [];
    const challenge = { requiresEmailOtp: true, challengeId: 'a'.repeat(64), resendAfter: 60 };
    const context = { exports: {}, require(name) {
      if (name === 'react') return {
        useState(initial) { const n = index++; if (!(n in slots)) slots[n] = initial;
          return [slots[n], value => { slots[n] = typeof value === 'function' ? value(slots[n]) : value; }]; },
        useEffect() {},
      };
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key });
      if (name === '../lib/api') return { api: async () => { throw Error('unexpected resend during cooldown'); } };
      if (name === '../lib/auth-context') return { useAuth: () => ({
        verifyEmailOtp: async (id, code) => {
          assert.equal(id, challenge.challengeId); assert.equal(code, '012345'); verified++;
          return { requiresTotp: true, factorId: 'existing-mfa' };
        }, verifyTotp: async () => null,
      }) };
      throw Error(`Unexpected import ${name}`);
    } };
    vm.runInNewContext(js, context);
    const props = {
      onLogin: async () => { loggedIn++; return challenge; },
      onRegister: async () => { registered++; return challenge; },
    };
    const render = () => { index = 0; return nodes(context.exports.default(props)); };
    if (signup) render().find(n => n.type === 'button' && n.props.children === 'Create account').props.onClick();
    let tree = render();
    tree.find(n => n.type === 'input' && n.props.type === 'email').props.onChange({ target: { value: 'user@example.com' } });
    tree.find(n => n.type === 'input' && n.props.type === 'password').props.onChange({ target: { value: 'long-password-test' } });
    await render().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    tree = render();
    assert.equal(signup ? registered : loggedIn, 1);
    assert(!tree.some(n => n.type === 'input' && n.props.type === 'password'), 'credentials are replaced by OTP entry');
    assert(tree.some(n => n.type === 'button' && n.props.disabled && n.props.children === 'Resend code in 60s'));
    const input = tree.find(n => n.type === 'input' && n.props.id === 'email-otp');
    assert.equal(input.props.autoComplete, 'one-time-code');
    input.props.onChange({ target: { value: '0x12345' } });
    await render().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(verified, 1);
    tree = render();
    assert(!tree.some(n => n.type === 'input' && n.props.id === 'email-otp'));
    assert(tree.some(n => n.type === 'input' && n.props.value === '' && n.props.autoComplete === 'one-time-code'), 'existing MFA entry follows email verification');
  }
  console.log('PASS: registration and unverified login show email OTP, numeric input preserves leading zeros, resend cooldown disables the button, and successful OTP continues to existing MFA.');
})().catch(error => { console.error(error); process.exitCode = 1; });
