# Telemedicine Portal

A patient portal for finding providers and booking virtual appointments. Everything runs against a mocked API — there is no backend.

## Running it

Requires Node 20+ (CI uses Node 22).

```bash
npm install
npm run dev
```

Any non-empty email and password will sign you in. MSW starts automatically in
development **and** in a production build, because the demo has no server. There
is no network traffic to a real API.

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

- 115 unit/integration tests, ~82.8% statement coverage, and per-directory
  thresholds for reducers, schemas, hooks and API modules.
- 7 Playwright flows covering auth redirects, upload progress/retry, and
  optimistic chat.
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

1. Connect the repository to Netlify or Vercel (build command and output
   directory are already configured).
2. Deploy. The mock API runs in the deployed build too, so the demo is fully
   interactive without a backend.

Environment overrides:

| Variable                   | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `VITE_DISABLE_MOCKS=true`  | Turn MSW off and call a real `/api` backend instead |
| `VITE_BASE_PATH=/subpath/` | Deploy under a path rather than the domain root     |

The Slidev deck in `deck/` is deployed separately and has its own
`netlify.toml` / `vercel.json`.

## Layout

- `src/features/` — one folder per domain (providers, scheduling, appointments, documents, chat, profile, auth)
- `src/mocks/` — MSW handlers and the in-memory seed data
- `src/components/ui/` — shadcn components on Base UI
- `src/components/shared/` — page-level primitives (`AsyncStatus`, states, skeletons)
- `docs/` — API contract, routes, state ownership, design tokens, decisions
- `deck/` — Slidev presentation

## Notes

- Uploads use XHR rather than fetch, because fetch cannot report progress.
- Chat polls instead of using websockets; messages are merged by id so an optimistic send is never dropped.
- The mock API adds 200–600 ms of latency on purpose, so loading states are real.
- `docs/decisions.md` is the source of truth for every architectural choice;
  new decisions should be recorded there before they are implemented.
