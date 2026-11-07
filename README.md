# Telemedicine Portal

A patient portal for finding providers, booking virtual appointments, uploading
documents, messaging a doctor, and paying with Paystack.

The live backend is the default. It is an Express 5 + Prisma + PostgreSQL
service in [`server/`](server/README.md) with HTTP-only session cookies, patient
signup, seeded doctor accounts, role-aware messaging, and Paystack test-mode
payments.

MSW is still available for isolated UI work and for the Vitest/Playwright
suites. It is opt-in, not the default:

```bash
VITE_ENABLE_MOCKS=true npm run dev
```

## Accounts

### Patients

All three seeded patients use the same password.

| Patient      | Email                      | Password             |
| ------------ | -------------------------- | -------------------- |
| Nadia Okafor | `nadia.okafor@example.com` | `demo-password-2026` |
| Tomas Silva  | `tomas.silva@example.com`  | `demo-password-2026` |
| Mei Chen     | `mei.chen@example.com`     | `demo-password-2026` |

New patients can register at `/auth/register`; the server hashes passwords with
bcrypt and creates an `Account` plus `Patient` in one transaction.

### Doctors

Every seeded provider has a login. The email is deterministic:

```text
dr.<first>.<last>.<provider-id>@doctors.example
```

Examples:

| Doctor           | Email                                    | Password             |
| ---------------- | ---------------------------------------- | -------------------- |
| Dr. Amara Okafor | `dr.amara.okafor.prv_01@doctors.example` | `demo-password-2026` |
| Dr. Daniel Silva | `dr.daniel.silva.prv_03@doctors.example` | `demo-password-2026` |

A doctor signs in at the same `/auth/login` form and lands on `/provider`, where
they can edit their profile, set a price per consultation type, publish
availability, see paid appointments, and reply to patient messages.

## Running locally

Requires Node 20+ (CI uses Node 22) and PostgreSQL.

1. Configure and start the API:

   ```bash
   cd server
   cp .env.example .env          # DATABASE_URL, DIRECT_URL, SEED_SECRET
   npm install
   npx prisma migrate deploy
   npm run seed                  # deterministic demo data
   npm run dev                   # http://localhost:3001 (or PORT in .env)
   ```

2. Start the frontend from the repository root:

   ```bash
   npm install
   npm run dev                   # http://localhost:5173
   ```

   The Vite proxy forwards `/api/*` to `VITE_API_PROXY_TARGET` (default
   `http://localhost:3001`). A local `.env.local` can point at a different port.

3. Paystack test mode:

   - Server: `PAYSTACK_SECRET_KEY=sk_test_...` in `server/.env`.
   - Frontend: `VITE_PAYSTACK_PUBLIC_KEY=pk_test_...` in `.env.local`.
   - For offline UI work, set `PAYSTACK_FAKE=true` on the server and
     `VITE_PAYMENTS_FAKE=true` on the frontend. Both are test-only; never ship
     them enabled.

The payment flow is: create a 10-minute hold, initialize a Paystack transaction
server-side, open the inline popup, verify the reference server-side, and
reconcile with the webhook. Duplicate events are idempotent. A payment after the
hold expires is recorded and refund-pending; it does not revive the slot.

## Mock mode

```bash
VITE_ENABLE_MOCKS=true npm run dev
```

MSW answers `/api` in the browser with the deterministic seed data. The Vitest
node server and the Playwright mock project also use MSW. A production build
never includes the worker unless the flag is explicitly set, and
`import.meta.env.DEV` keeps it out of production bundles.

## Scripts

| Command                                         | What it does                                            |
| ----------------------------------------------- | ------------------------------------------------------- |
| `npm run dev`                                   | Vite dev server against the real API                    |
| `npm test`                                      | Unit + integration tests (Vitest, Testing Library, MSW) |
| `npm run test:coverage`                         | The suite plus per-directory coverage thresholds        |
| `npm run e2e`                                   | Playwright against the dev server (MSW enabled)         |
| `npm run build`                                 | Typecheck, then production build                        |
| `npm run lint`                                  | ESLint                                                  |
| `npm run typecheck`                             | `tsc -b` with strict project settings                   |
| `npm run format:check`                          | Prettier check                                          |
| `cd server && npm run test:server`              | Server unit tests                                       |
| `cd server && PAYSTACK_FAKE=true npm run smoke` | End-to-end API smoke suite                              |

## Quality gates

- 118 unit/integration tests, ~83.0% statement coverage, and per-directory
  thresholds for reducers, schemas, hooks and API modules.
- 8 Playwright flows covering auth redirects, upload progress/retry,
  appointment-scoped uploads, and optimistic chat.
- 47-check server smoke suite covering sessions, role guards, booking, payments,
  documents, real doctor replies, and seed gating.
- CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests,
  build and E2E on every push or pull request to `develop` and `main`.
- Accessibility: skip link with a focusable target, landmarks, `aria-current`,
  labelled controls, an accessible upload progress bar, visible focus rings,
  `prefers-reduced-motion` handling, and contrast-tested design tokens.

## Deployment

The intended topology is:

```text
Netlify/Vercel frontend --same-origin /api/*--> Render Express --> Supabase PostgreSQL
                                                        └──────--> Paystack test API
```

- **Supabase:** `DATABASE_URL` is the transaction pooler (6543, with
  `pgbouncer=true`); `DIRECT_URL` is the session pooler (5432) for
  `prisma migrate deploy`.
- **Render:** deploy `server/`, run `npx prisma migrate deploy` and
  `npm run build`, start `npm start`, health check `/health`. Set the Paystack
  secret key, `APP_ORIGIN`, `CORS_ORIGIN`, session TTLs, and `PAYSTACK_FAKE=false`.
- **Netlify/Vercel:** replace `REPLACE_WITH_RENDER_URL` in `netlify.toml` and
  `vercel.json`, set `VITE_PAYSTACK_PUBLIC_KEY`, and leave `VITE_ENABLE_MOCKS`
  unset. The `/api/*` rewrite keeps cookies first-party; verify `Set-Cookie`
  survives the host proxy on the first preview deploy.
- **Paystack webhook:** register
  `https://<render-host>/api/payments/webhook` in test mode and subscribe to
  `charge.success` and `refund.processed`.

Environment overrides:

| Variable                   | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `VITE_ENABLE_MOCKS=true`   | Opt into MSW in development (never the live build)     |
| `VITE_API_PROXY_TARGET`    | Local dev only: Vite proxy target                      |
| `VITE_API_BASE_URL`        | Default `/api`; set only for a direct cross-origin API |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack test public key                               |
| `VITE_PAYMENTS_FAKE=true`  | Test-only simulate-payment button                      |
| `VITE_SHOW_DEMO_ACCOUNTS`  | Show seeded credentials on the login page              |
| `VITE_BASE_PATH=/subpath/` | Deploy under a path rather than the domain root        |

## Layout

- `src/features/` — one folder per domain (providers, scheduling, appointments, payments, documents, chat, provider-portal, profile, auth)
- `src/mocks/` — MSW handlers and deterministic seed data (mock/test mode)
- `server/` — Express + Prisma + PostgreSQL API
- `src/components/ui/` — shadcn components on Base UI
- `src/components/shared/` — page-level primitives (`AsyncStatus`, states, skeletons)
- `docs/` — API contract, routes, state ownership, design tokens, decisions
- `deck/` — Slidev presentation

## Notes

- Auth is a database-backed session referenced by an HTTP-only cookie. Tokens are
  never stored in JavaScript; there is no JWT and no localStorage session.
- The API layer is feature-owned (`src/features/*/api.ts` plus
  `src/lib/apiClient.ts`); forms, error envelopes and field names match the mock
  and real contracts.
- Uploads use XHR rather than fetch, because fetch cannot report progress; the
  session cookie is sent with `withCredentials`.
- Chat polls instead of using websockets; messages are merged by id so an
  optimistic send is never dropped. Doctor replies are real persisted messages,
  not simulated.
- The mock API adds 200–600 ms of latency on purpose, so loading states are real.
- This remains a demonstration using synthetic data and Paystack test mode. It is
  not a clinical service and does not claim regulatory compliance.
- `docs/decisions.md` is the source of truth for every architectural choice;
  new decisions should be recorded there before they are implemented.
