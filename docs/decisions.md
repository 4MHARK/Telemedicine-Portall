# Locked Decisions

Every decision here is frozen for the duration of the project. Reopening one requires a documented reason and a reviewer sign-off.

## Project Scope

- **In scope:** provider search & filtering, multi-step scheduling wizard, secure document uploads with progress, real patient/doctor accounts with session cookies, role-aware messaging, Paystack test-mode payments, live Express/Prisma/PostgreSQL backend.
- **Out of scope:** real video/audio, real PHI handling, HIPAA compliance, clinic/admin roles, email verification, password reset, notifications/email.
- **Data:** deterministic synthetic seed data. MSW is used for unit/integration/browser tests; the deployed app talks to the real API.

## Architectural Decisions

| # | Area | Decision | Rationale | Revisit if |
|---|---|---|---|---|
| 1 | Forms | react-hook-form + zod; zod owns **form** types only | zod schemas double as validation + type safety; RHF handles complex multi-step state efficiently | never |
| 2 | Entity types | Hand-written in `src/types/*`, **not** inferred from zod | entities and form shapes differ (e.g. wizard has `slotId`, entity has nested `slot`) | never |
| 3 | Wizard | Single `useForm` across all steps; `trigger([...])` gates per-step progression | step 5 must submit all fields together | step isolation becomes a hard requirement |
| 4 | Auth | HTTP-only `tm_session` cookie backed by a hashed `Session` row; guards via React Router 7 `loader` calling `/auth/me` | no token in JavaScript; revocation and role checks are server-side | email verification / password reset ship |
| 5 | 401 handling | Global handler in `apiClient` redirects to `/auth/login` with `?next`; the server owns the cookie | prevents half-authenticated state after expiry or revocation | never |
| 6 | Upload transport | **XHR** (not `fetch`); wraps in a Promise with `onProgress` callback | `fetch` cannot report upload progress | never |
| 7 | Upload state | Progress lives in Context + Reducer, **not** TanStack Query | Query has no concept of transfer progress | never |
| 8 | Upload mock | In DEV, XHR wrapper emits synthetic progress ticks on a timer; MSW resolves | MSW v2 cannot emit real `upload.onprogress` events | MSW adds upload progress support |
| 9 | Chat transport | Polling — `refetchInterval` 3000ms (open) / 10000ms (list); `refetchIntervalInBackground: false` | simple, no infra; real doctor replies are persisted and polled | real-time required → SSE/WebSocket |
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
| 27 | Form validation depth | real email/password policy on register; login stays presence-only to avoid leaking account state | server validates and hashes with bcrypt; the client checks shape | policy changes |
| 28 | Zod major | ^4.6.7 in root and server | fixes GHSA-mrhx-c7xc-m3w5; @hookform/resolvers 5.9.1 supports zod 4 | a dependency requires zod 3 |
| 29 | shadcn placement | devDependency; imported only for `shadcn/tailwind.css` at build time | its CLI tree is not needed at runtime and pulled avoidable audit findings | shadcn ships a runtime-only import |
| 30 | Session persistence | server HTTP-only cookie; mock/test mode uses a module session plus a test-only cookie | no browser-readable credential; `?next` still restricted to same-origin paths | never |
| 31 | Test timeout | 15s (not default 5s) | MSW's mandated 200–600ms latency makes the 5s default unreachable | MSW latency removed |
| 32 | Base UI dropdown-menu | added as a needed primitive | account menu requires it | never |
| 33 | `field` upload test caveat | `fail-*` rule is verified in browser, not jsdom | jsdom File cross-realm serializes filename as "blob"; needs Playwright | Phase 3 adds Playwright E2E |
| 34 | Upload limits | cap at 10 files per drop | prevents a single drop flooding the queue; no count exists in the API contract | never |
| 35 | Filter history | every URL write uses `replace: true` | typing must not bury the previous page under thirty history entries | never |
| 36 | Poll merge location | merging inside `queryFn` by reading the cache | React Query otherwise replaces the array and wipes optimistic sends | never |
| 37 | Query retry policy | QueryClient declines to retry 4xx | a missing provider otherwise sits behind three retries before "Provider not found" renders | never |
| 38 | Upload queue placement | UploadProvider mounted above the routes | leaving `/documents` mid-upload must not drop the queue | never |
| 39 | Chat retry | drop the failed optimistic message before re-sending its text | avoids duplicate bubbles for one logical send | never |
| 40 | Auth context sync | useLogin/useRegister/useLogout update the `auth.me` query and Context | otherwise the provider and route guards disagree about the session | never |
| 41 | Header data source | reads useAuth(), hydrated from GET /auth/me | one boot request; the header stays consistent with the profile | never |
| 42 | Wizard slot range | 7-day/14-day ranges computed once in a state initializer | recomputing per render mints a new query key and refetches forever | never |
| 43 | Playwright browser | `channel: 'chrome'` | uses installed Chrome instead of downloading a browser binary | never |
| 44 | Test timing | `asyncUtilTimeout` raised to 15s | mandated 200–600ms mock latency puts some pages past the 1s default | MSW latency removed |
| 45 | Production mocks | MSW is opt-in with `VITE_ENABLE_MOCKS=true` and only in development; production uses the real API | the live backend is now the default; mocks remain for tests and isolated UI work | never |
| 46 | Deployment | Netlify and Vercel SPA configs at the repo root; CI uploads the verified `dist/` | deep links need an `/index.html` rewrite; the artifact CI builds is the one that deploys | hosting target changes |
| 47 | Accessibility contrast | text-subtle, danger, border-strong and focus-ring tuned to the documented ratios; destructive controls use a solid danger fill | the old values missed 4.5:1 text and 3:1 control-boundary contrast in light and dark | palette revisited |
| 48 | Provider pagination | 12 per page on `/doctors`, controls in the page, page kept in `?page=` | closes row 26; the URL is already the filter source of truth | never |
| 49 | Route error reset | the route boundary resets when `location.key` changes | without it, shell navigation cannot leave a page that crashed | never |
| 50 | `?next` hardening | reject `//` and `\` prefixes | protocol-relative and backslash forms normalize to an open redirect | never |
| 51 | Document sharing | uploads carry an optional `appointmentId`; the appointment detail page and the Documents tab expose it | makes “share with your provider” real; the contract, `Document` type and XHR transport already supported it | a real file-sharing or PHI system ships |
| 52 | Backend | Express 5 + Prisma + PostgreSQL in `server/`; patient and doctor accounts; Paystack test payments; same-origin `/api` rewrite | live sessions, real doctor identities, and paid booking share one contract | a clinic/admin portal ships |
| 53 | Backend auth | account creation + bcrypt login + hashed server sessions; seeded patient and doctor accounts; no public doctor self-registration | doctors must be verified by a real clinic process, not self-asserted in a student demo | clinic approval workflow ships |
| 54 | Document bytes | uploads are stored in PostgreSQL `bytea`, 10 MB cap | Render free tier has no persistent disk; metadata-only uploads would be lost on restart | object storage is introduced |
| 55 | Chat replies | doctors send real persisted messages through the role-aware conversation endpoint; no simulated timer | the demo now has real doctor sessions, so the old auto-reply would be a fake | real-time transport (SSE/WebSocket) ships |

Backend delivery note: `server/` is the live API for both patient and doctor
accounts. MSW is opt-in with `VITE_ENABLE_MOCKS=true` and is used by the test
suites; the deployed app uses the real API through the same-origin `/api`
rewrite (rows 52–55).

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
- [x] Backend delivery — Express/Prisma API with patient + doctor accounts,
  HTTP-only sessions, role-aware messaging, and Paystack test payments (rows
  52–55).
- [x] WCAG audit — manual axe-core 4.10.2 run (WCAG 2.2 A/AA): 0 violations on
  login, doctors, provider detail, appointments, documents, messages, chat,
  profile and scheduling; desktop and mobile, light and dark.
