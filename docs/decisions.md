# Locked Decisions

Every decision here is frozen for the duration of the project. Reopening one requires a documented reason and a reviewer sign-off.

## Project Scope

- **In scope:** provider search & filtering, multi-step scheduling wizard, secure document uploads with progress, live chat simulation, mock authentication.
- **Out of scope:** real payments, real video/audio, real backend, real PHI handling, HIPAA compliance, notifications/email.
- **Data:** all data is mocked via MSW v2. No real network calls leave the browser.

## Architectural Decisions

| # | Area | Decision | Rationale | Revisit if |
|---|---|---|---|---|
| 1 | Forms | react-hook-form + zod; zod owns **form** types only | zod schemas double as validation + type safety; RHF handles complex multi-step state efficiently | never |
| 2 | Entity types | Hand-written in `src/types/*`, **not** inferred from zod | entities and form shapes differ (e.g. wizard has `slotId`, entity has nested `slot`) | never |
| 3 | Wizard | Single `useForm` across all steps; `trigger([...])` gates per-step progression | step 5 must submit all fields together | step isolation becomes a hard requirement |
| 4 | Auth | Mock JWT stored in `localStorage`; guards via React Router 7 `loader` | simplest realistic guard; no flash-of-protected-content | real backend |
| 5 | 401 handling | Global handler in `apiClient` clears session and redirects to `/auth/login` | prevents half-authenticated state after token expiry | never |
| 6 | Upload transport | **XHR** (not `fetch`); wraps in a Promise with `onProgress` callback | `fetch` cannot report upload progress | never |
| 7 | Upload state | Progress lives in Context + Reducer, **not** TanStack Query | Query has no concept of transfer progress | never |
| 8 | Upload mock | In DEV, XHR wrapper emits synthetic progress ticks on a timer; MSW resolves | MSW v2 cannot emit real `upload.onprogress` events | MSW adds upload progress support |
| 9 | Chat transport | Polling — `refetchInterval` 3000ms (open) / 10000ms (list); `refetchIntervalInBackground: false` | simple, no infra; matches "simulation" requirement | real-time required → SSE/WebSocket |
| 10 | Chat merge | Merge incoming messages **by message id**, never replace the array | protects optimistic sends from being wiped by a poll | never |
| 11 | Chat perf | `React.memo` on `<MessageBubble>`; stable keys | 3s polling on long threads causes visible jank without it | never |
| 12 | UI kit | shadcn/ui with **Base UI** primitives | per project requirements | a needed component has no Base UI port → fallback to Radix for that component only, documented |
| 13 | Breakpoints | Tailwind v4 defaults: `md: 768px`, `lg: 1024px`, `xl: 1280px` | already match the spec; no override needed | never |
| 14 | Dark mode | **enabled** | locked before the token layer, so every color token ships a dark counterpart | never |
| 15 | Coverage | Per-directory thresholds, **not** global | protects signal; global thresholds encourage testing presentational wrappers | never |
| 16 | E2E | Playwright added to stack | required for auth / upload / chat flows | never |
| 17 | Git | `main` protected, `develop` integration, `feature/*` per slice | clean history, reviewable PRs | never |
| 18 | Commits | Conventional Commits enforced via commitlint + husky | machine-readable history; auto-generated changelogs later | never |
| 19 | Form primitive | shadcn `field` (Base UI), not `form` | `form` has no Base UI port in shadcn's current registry; `field` is the official successor | `field` deprecated or removed |
| 20 | Public data endpoints | `/specialties` and `/providers*` are unauthenticated | routes.md marks `/doctors` public — public routes need public data endpoints, or anonymous visitors bounce to login | never |
| 21 | Wizard path | `/schedule/:providerId` (top-level, not nested under `/doctors`) | routes.md table says `/schedule/:providerId`; the tree's alternative variant is a typo | never |
| 22 | Availability windows | `now` = 2h, `today` = 24h, `week` = 7d (rolling from now) | api-contract.md defined the enum but not the bounds | never |
| 23 | Multi-specialty filter | OR — any selected specialty matches | standard filter semantics | never |
| 24 | Slots missing from/to | 422 VALIDATION with fieldErrors | api-contract.md marks them required but specifies no error | never |
| 25 | Appointment unknown refs | 404 NOT_FOUND for unknown providerId or slotId | api-contract.md doesn't cover it | never |
| 26 | Provider pagination | `/doctors` shows page 1 (12 of 40); pagination controls in Phase 3 | api-contract.md default pageSize is 12 | never |
| 27 | Form validation depth | presence-only; no email-format rule | mock API accepts any non-empty credentials | real backend |
| 28 | Zod major | ^3.25.76, not 4 | @hookform/resolvers peers on zod ^3.23.8 | resolvers supports zod 4 |
| 29 | shadcn as runtime dep | stays in dependencies, not devDependencies | src/index.css imports shadcn/tailwind.css at build time | shadcn ships a build-time-only package |
| 30 | Session storage | localStorage key `telemedicine-portal:session`; `?next` restricted to same-origin paths | prevents open redirect | never |
| 31 | Test timeout | 15s (not default 5s) | MSW's mandated 200–600ms latency makes the 5s default unreachable | MSW latency removed |
| 32 | Base UI dropdown-menu | added as a needed primitive | account menu requires it | never |
| 33 | `field` upload test caveat | `fail-*` rule is verified in browser, not jsdom | jsdom File cross-realm serializes filename as "blob"; needs Playwright | Phase 3 adds Playwright E2E |
| 34 | Upload limits | cap at 10 files per drop | prevents a single drop flooding the queue; no count exists in the API contract | never |
| 35 | Filter history | every URL write uses `replace: true` | typing must not bury the previous page under thirty history entries | never |
| 36 | Poll merge location | merging inside `queryFn` by reading the cache | React Query otherwise replaces the array and wipes optimistic sends | never |
| 37 | Query retry policy | QueryClient declines to retry 4xx | a missing provider otherwise sits behind three retries before "Provider not found" renders | never |
| 38 | Upload queue placement | UploadProvider mounted above the routes | leaving `/documents` mid-upload must not drop the queue | never |
| 39 | Chat retry | drop the failed optimistic message before re-sending its text | avoids duplicate bubbles for one logical send | never |
| 40 | Auth context sync | useLogin/useLogout update Context as well as storage | otherwise the provider serves a stale session for the page's lifetime | never |
| 41 | Header data source | reads useAuth() instead of GET /auth/me | removes a request per page load and keeps the header consistent with profile | never |
| 42 | Wizard slot range | 7-day/14-day ranges computed once in a state initializer | recomputing per render mints a new query key and refetches forever | never |
| 43 | Playwright browser | `channel: 'chrome'` | uses installed Chrome instead of downloading a browser binary | never |
| 44 | Test timing | `asyncUtilTimeout` raised to 15s | mandated 200–600ms mock latency puts some pages past the 1s default | MSW latency removed |
| 45 | Production mocks | MSW starts in every build unless `VITE_DISABLE_MOCKS=true` | the deliverable is a mock-only demo; a production SPA with the worker off has no backend | a real backend ships |
| 46 | Deployment | Netlify and Vercel SPA configs at the repo root; CI uploads the verified `dist/` | deep links need an `/index.html` rewrite; the artifact CI builds is the one that deploys | hosting target changes |
| 47 | Accessibility contrast | text-subtle, danger, border-strong and focus-ring tuned to the documented ratios; destructive controls use a solid danger fill | the old values missed 4.5:1 text and 3:1 control-boundary contrast in light and dark | palette revisited |
| 48 | Provider pagination | 12 per page on `/doctors`, controls in the page, page kept in `?page=` | closes row 26; the URL is already the filter source of truth | never |
| 49 | Route error reset | the route boundary resets when `location.key` changes | without it, shell navigation cannot leave a page that crashed | never |
| 50 | `?next` hardening | reject `//` and `\` prefixes | protocol-relative and backslash forms normalize to an open redirect | never |
| 51 | Document sharing | uploads carry an optional `appointmentId`; the appointment detail page and the Documents tab expose it | makes “share with your provider” real; the contract, `Document` type and XHR transport already supported it | a real file-sharing or PHI system ships |
Note: Overall statement coverage is ~83.0% (118 tests). Per-directory thresholds all pass (100% on reducers/schemas/hooks, 95%+ on API). The `fail-*` upload retry is covered browser-only in Playwright due to a jsdom File cross-realm limitation.

Deployment note: the Netlify/Vercel configuration and the CI `dist/` artifact are in place. Publishing the live URL still requires connecting the repository to the hosting account; no credential is stored in the repo.

## Testing Coverage Targets

| Path | Threshold |
|---|---|
| `src/features/**/reducer.ts` | 90% |
| `src/features/**/schemas.ts` | 90% |
| `src/hooks/**` | 85% |
| `src/features/**/api.ts` | 80% |
| `src/components/primitives/**` | no threshold |
| Everything else | no global minimum |

## E2E Flows (Playwright)

1. Login → redirect to protected route → logout → redirected to login.
2. Unauthenticated access to `/documents` → redirected to `/auth/login`.
3. Upload a document → see progress → see success badge.
4. Upload a `fail-*` file → see error → click retry → see success.
5. Send a chat message → appears optimistically → poll confirms → status flips to `sent`.
6. Upload a document from an appointment → it appears on that visit as shared.

## Open Items

All resolved before final defense:

- [x] **shadcn/Base UI spike** — delivered; `field` is the form primitive (row 19).
- [x] Decide dark mode — enabled (row 14).
- [x] Provider pagination controls — delivered (row 48).
- [x] Production mock API + deployment config — delivered (rows 45–46).
- [x] WCAG audit — manual axe-core 4.10.2 run (WCAG 2.2 A/AA): 0 violations on
  login, doctors, provider detail, appointments, documents, messages, chat,
  profile and scheduling; desktop and mobile, light and dark.
