# Trade Client Frontend

Next.js + TypeScript + Tailwind CSS frontend for the Booran Motor Group Trade Client API.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set server-side `API_BACKEND_URL` to the NestJS API URL including `/api/v1` (for example `https://your-api.example.com/api/v1`). For a local backend use `http://localhost:4050/api/v1`.
3. Run `npm install`, then `npm run dev`.

For the default local backend on port 4050, `npm run dev` reuses a running backend
or starts the sibling `trade-client-app` backend automatically and waits for it
before starting Next.js. Install the backend dependencies and configure its `.env`
first. Keep this terminal open. Use `npm run dev:frontend` if you manage both
processes yourself. Hosted API destinations are used as configured.

Without an explicit upstream setting, development uses `http://127.0.0.1:4050/api/v1` and production uses `https://trade-client-app.vercel.app/api/v1`. Start the matching local backend with `npm run start:local` from the backend folder. This starts on port 4050 with localhost origins and development cookie settings without changing production `.env` values. Set `AUTH_FRONTEND_URL` and explicit `CORS_ORIGIN` on the deployed backend to `https://trade-client-frontend.vercel.app`.

## Connected API areas

Authentication, dashboard group metrics, rooftops, orders, parts search, accounts, PartsCheck metrics, and audit activity are connected through `lib/api.ts`. Browser requests use the first-party `/api/v1` proxy. Session cookies are HttpOnly, host-only, SameSite=Lax, and Secure in production. Tokens are never read by frontend JavaScript. Mutations send a signed CSRF token; refresh calls are serialized within a tab and across tabs where Web Locks is supported. Existing `NEXT_PUBLIC_API_URL` values are accepted only as a server-side proxy destination for compatibility.

Deploy the frontend and backend together. Existing localStorage sessions require signing in again. Rebuild/redeploy the frontend after changing the proxy destination.

**Set up or recover your account** combines forgotten-password and verification
resend requests into one emailed link. Saving the password also verifies the email,
signs out older sessions, and preserves 2FA. Normal signup still sends its initial
verification email automatically. The old request URLs remain compatible.

The profile menu's **Manage 2FA** action supports authenticator enrollment, one-time
recovery-code download, and disabling with a password plus a valid code. Login
supports either an authenticator code or a single-use recovery code. Deploy the
backend's `AUTH_TOTP_ENCRYPTION_KEY` with the corresponding database and preserve
it across redeployments; it is never exposed to the frontend.

Validation: `npx tsc --noEmit`, `node test/session-client.smoke.cjs`, and `node test/proxy.smoke.cjs`. The proxy check starts temporary localhost servers with fake credentials and verifies cookie forwarding; it does not use live accounts.
