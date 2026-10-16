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

## Open Items

- [ ] **shadcn/Base UI spike** — 30 min before Phase 1. Install `button`, `dialog`, `sheet`, `tabs`, `form` with Base UI; confirm all render. If any fails, document the fallback in this table.
- [ ] Decide dark mode (row 14).