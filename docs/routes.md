# Route Map

Router: React Router 7 (data router). Guards via route `loader`, not wrapper
components. The guard calls `/auth/me`; the server owns the session cookie.

## Route Table

| Path | Access | Loader / Guard | Feature |
|---|---|---|---|
| `/` | public | redirect → authed ? role home : `/auth/login` | — |
| `/auth/login` | public | redirect → authed ? role home : null | auth |
| `/auth/register` | public | redirect → authed ? role home : null | patient signup |
| `/doctors` | public | — | provider search |
| `/doctors/:providerId` | public | 404 if provider missing | provider detail |
| `/schedule/:providerId` | **patient** | `requirePatient` | scheduling wizard |
| `/checkout/:appointmentId` | **patient** | `requirePatient` | Paystack checkout |
| `/appointments` | **patient** | `requirePatient` | appointment list |
| `/appointments/:id` | **patient** | `requirePatient` + ownership check → 403/404 | appointment detail |
| `/documents` | **patient** | `requirePatient` | uploads |
| `/messages` | **patient** | `requirePatient` | conversation list |
| `/messages/:conversationId` | **patient** | `requirePatient` + participant check | chat |
| `/profile` | **patient** | `requirePatient` | profile |
| `/provider` | **doctor** | `requireDoctor` | doctor dashboard |
| `/provider/availability` | **doctor** | `requireDoctor` | slot management |
| `/provider/appointments` | **doctor** | `requireDoctor` | own appointments |
| `/provider/messages` | **doctor** | `requireDoctor` | patient conversations |
| `/provider/messages/:conversationId` | **doctor** | `requireDoctor` + participant check | chat |
| `/provider/profile` | **doctor** | `requireDoctor` | profile + fees |
| `*` | public | — | 404 |

## Auth Guard

`getSession()` calls `GET /auth/me` through the shared TanStack Query cache:

1. The loader `ensureQueryData`s the `auth.me` query.
2. No session → `throw redirect('/auth/login?next=' + encodeURIComponent(pathname))`.
3. Patient routes additionally require `account.role === 'patient'`; doctor
   routes require `role === 'doctor'`. The wrong role is redirected to its own
   home, never shown a half-authorized shell.

The login route reads `?next=` (same-origin paths only) and redirects there after
success. Without `?next`, patients land on `/doctors` and doctors on `/provider`.

## Global 401 Handler

`apiClient` intercepts any `401` on a non-`/auth/*` route:

1. Redirect to `/auth/login?next=<current path>`.
2. Throw the typed `ApiError`, so the in-flight query stops.

The server clears/rotates the cookie; there is no client-side token to delete.

## Responsive Shell Behavior

| Breakpoint | Nav | Layout |
|---|---|---|
| `< md` (mobile) | bottom tab bar (5 role-specific items) | single column; master-detail routes render one pane at a time |
| `md` – `lg-1` (tablet) | icon rail | two-column where useful |
| `lg` + (desktop) | full sidebar | master-detail side-by-side (e.g. `/messages` shows list + chat) |
| `xl` + (wide) | full sidebar + optional detail panel | max-width container |

## Code Splitting

Every top-level feature route lazy-loads:

- `/doctors/*` → provider search/detail
- `/schedule/*` + `/checkout/*` → scheduling and payment
- `/appointments/*` → appointments
- `/documents` → documents
- `/messages/*` → patient messaging
- `/provider/*` → doctor portal

Shared shell, auth, and primitives are in the main bundle.
