# Trade Client Frontend

Next.js + TypeScript + Tailwind CSS frontend for the Booran Motor Group Trade Client API.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_URL` to the deployed NestJS API URL including `/api/v1` (for example `https://your-api.example.com/api/v1`).
3. Run `npm install`, then `npm run dev`.

The current backend repository only exposes a local URL (`http://localhost:3000/api/v1`), so the frontend defaults to that value until the deployed URL is supplied.

## Connected API areas

Authentication, dashboard group metrics, rooftops, orders, parts search, accounts, PartsCheck metrics, and audit activity are connected through the live API client in `lib/api.ts`. The UI stores the returned access token in `localStorage` and sends it as a bearer token.
