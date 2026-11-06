# Telemedicine Portal

A patient portal for finding providers and booking virtual appointments.

It ships in two modes:

- **Mock mode (default, and the fallback):** MSW v2 answers every `/api` call in
  the browser. No server and no network. This is the build to switch to if the
  live backend misbehaves.
- **Backend mode:** `VITE_DISABLE_MOCKS=true` turns MSW off, and the Express +
  Prisma + PostgreSQL service in [`server/`](server/README.md) answers the exact
  same contract.

## Demo accounts

All three seeded patients use the same password. The login screen also shows
these as a hint.

| Patient      | Email                      | Password             |
| ------------ | -------------------------- | -------------------- |
| Nadia Okafor | `nadia.okafor@example.com` | `demo-password-2026` |
| Tomas Silva  | `tomas.silva@example.com`  | `demo-password-2026` |
| Mei Chen     | `mei.chen@example.com`     | `demo-password-2026` |

In mock mode any non-empty credentials work. In backend mode the password is
checked with bcrypt, so use the table above.

## Running it

Requires Node 20+ (CI uses Node 22).

### Mock mode

```bash
npm install
npm run dev
```

MSW starts automatically in development **and** in a production build. There is
no network traffic to a real API.

### Backend mode, locally

1. Start the API — full steps in [`server/README.md`](server/README.md):

   ```bash
   cd server
   cp .env.example .env          # set DATABASE_URL, JWT_SECRET, SEED_SECRET
   npm install
   npx prisma migrate deploy
   npm run seed
   npm run dev                   # http://localhost:3001
   ```

2. Start the frontend with the service worker off:

   ```bash
   VITE_DISABLE_MOCKS=true VITE_API_PROXY_TARGET=http://localhost:3001 npm run dev
   ```

The Vite proxy forwards `/api/*` to Express. With MSW on, the service worker
intercepts the request before the proxy is reached.

## Scripts

| Command                 | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev`           | Vite dev server                                           |
| `npm test`              | Unit + integration tests (Vitest, Testing Library, MSW)   |
| `npm run test:coverage` | The suite plus per-directory coverage thresholds          |
| `npm run e2e`           | Playwright against the dev server (uses installed Chrome) |
| `npm run build`         | Typecheck, then production build                          |
| `npm run lint`          | ESLint                                                    |
| `npm run typecheck`     | `tsc -b` with strict project settings                     |
| `npm run format:check`  | Prettier check                                            |

## Quality gates

- 118 unit/integration tests, ~83.0% statement coverage, and per-directory
  thresholds for reducers, schemas, hooks and API modules.
- 8 Playwright flows covering auth redirects, upload progress/retry,
  appointment-scoped uploads, and optimistic chat.
- CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests,
  build and E2E on every push or pull request to `develop` and `main`. It
  uploads the verified `dist/` artifact and the coverage report.
- Accessibility: skip link with a focusable target, landmarks, `aria-current`,
  labelled controls, an accessible upload progress bar, visible focus rings,
  `prefers-reduced-motion` handling, and contrast-tested design tokens. A manual
  axe-core 4.10.2 audit (WCAG 2.2 A/AA) reported **0 violations** across the
  public and protected pages, desktop and mobile layouts, and both themes.

## Deployment

`netlify.toml` and `vercel.json` are ready at the repo root. Both build with
`npm run build`, publish `dist/`, rewrite deep links to `/index.html`, and add
basic security headers.

Deploy **two** frontends:

1. **Mock fallback** — deploy normally, with no `VITE_DISABLE_MOCKS` variable.
   The mock API runs in the deployed build, so it is fully interactive without a
   backend. Keep this URL open during the demo.
2. **Backend-wired** — set `VITE_DISABLE_MOCKS=true` in the build environment,
   and replace `REPLACE_WITH_RENDER_URL` in `netlify.toml` / `vercel.json` with
   the Render host. The browser still calls same-origin `/api`; the host
   forwards it to Render, so there is no CORS configuration to get wrong.

Environment overrides:

| Variable                   | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `VITE_DISABLE_MOCKS=true`  | Turn MSW off and call the real `/api` backend                       |
| `VITE_API_PROXY_TARGET`    | Local dev only: Vite proxy target (default `http://localhost:3001`) |
| `VITE_BASE_PATH=/subpath/` | Deploy under a path rather than the domain root                     |

Verify the rewrite from the deployed frontend:

```bash
curl https://YOUR-FRONTEND/api/health   # must return {"status":"ok"}
```

If that returns HTML, the rewrite is missing or still points at the placeholder.
The backend's full setup, Render steps, smoke test, demo script and failure list
are in [`server/README.md`](server/README.md).

The Slidev deck in `deck/` is deployed separately and has its own
`netlify.toml` / `vercel.json`.

## Layout

- `src/features/` — one folder per domain (providers, scheduling, appointments, documents, chat, profile, auth)
- `src/mocks/` — MSW handlers and the in-memory seed data (mock mode)
- `server/` — Express + Prisma + PostgreSQL API (backend mode)
- `src/components/ui/` — shadcn components on Base UI
- `src/components/shared/` — page-level primitives (`AsyncStatus`, states, skeletons)
- `docs/` — API contract, routes, state ownership, design tokens, decisions
- `deck/` — Slidev presentation

## Notes

- The API layer was already feature-owned (`src/features/*/api.ts` plus
  `src/lib/apiClient.ts`), so switching to the backend is configuration, not a
  component rewrite. Error envelopes and field names already match.
- Uploads use XHR rather than fetch, because fetch cannot report progress.
- A document can be shared with a scheduled visit from the appointment detail
  page or selected on the Documents tab; the visit association is stored on the
  document and shown in both places.
- Chat polls instead of using websockets; messages are merged by id so an optimistic send is never dropped.
- The mock API adds 200–600 ms of latency on purpose, so loading states are real.
- The backend is patient-only: no doctor login, signup or prescriptions, because
  the UI has none. `server/README.md` states this scope explicitly.
- `docs/decisions.md` is the source of truth for every architectural choice;
  new decisions should be recorded there before they are implemented.
