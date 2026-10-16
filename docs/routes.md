# Route Map

Router: React Router 7 (data router). Guards via route `loader`, not wrapper components.

## Route Table

| Path | Access | Loader / Guard | Feature |
|---|---|---|---|
| `/` | public | redirect → authed ? `/doctors` : `/auth/login` | — |
| `/auth/login` | public | redirect → authed ? `/doctors` : null | auth |
| `/doctors` | public | — | provider search |
| `/doctors/:providerId` | public | 404 if provider missing | provider detail |
| `/schedule/:providerId` | **protected** | `requireAuth` | scheduling wizard |
| `/appointments` | **protected** | `requireAuth` | appointment list |
| `/appointments/:id` | **protected** | `requireAuth` + ownership check → 403/404 | appointment detail |
| `/documents` | **protected** | `requireAuth` | uploads |
| `/messages` | **protected** | `requireAuth` | conversation list |
| `/messages/:conversationId` | **protected** | `requireAuth` + ownership check | chat |
| `/profile` | **protected** | `requireAuth` | profile |
| `*` | public | — | 404 |

## Route Tree

```
/                                   (redirect)
├── auth/
│   └── login                       public
├── doctors                         public
│   ├── :providerId                 public
│   └── :providerId/schedule        protected   ← wizard lives under provider
├── appointments                    protected
│   └── :id                         protected
├── documents                       protected
├── messages                        protected
│   └── :conversationId             protected
├── profile                         protected
└── *                               404
```

## Auth Guard

`requireAuth()` loader:

1. Read token from `localStorage`.
2. Validate structure + `exp` against current time (client-side only — mock).
3. If invalid or expired → `throw redirect('/auth/login?next=' + encodeURIComponent(pathname))`.
4. If valid → attach `patient` to loader data (or rely on auth Context, hydrated once on boot).

The login route reads `?next=` and redirects there after success. Default fallback: `/doctors`.

## Global 401 Handler

`apiClient` intercepts any `401` response:

1. Clear `localStorage` session key.
2. Redirect to `/auth/login?next=<current path>`.
3. Do **not** throw further — the redirect is terminal for that request.

This is the single source of truth for session invalidation. Route guards handle navigation; the 401 handler handles runtime token death mid-session.

## Responsive Shell Behavior

| Breakpoint | Nav | Layout |
|---|---|---|
| `< md` (mobile) | bottom tab bar (5 items) | single column; master-detail routes render one pane at a time |
| `md` – `lg-1` (tablet) | icon rail (collapsed sidebar) | two-column where useful |
| `lg` + (desktop) | full sidebar | master-detail side-by-side (e.g. `/messages` shows list + chat) |
| `xl` + (wide) | full sidebar + optional detail panel | max-width container |

## Code Splitting

Every top-level feature route lazy-loads:

- `/doctors/*` → `DoctorsFeature`
- `/schedule/*` → `SchedulingFeature`
- `/appointments/*` → `AppointmentsFeature`
- `/documents` → `DocumentsFeature`
- `/messages/*` → `MessagesFeature`

Shared shell, auth, and primitives are in the main bundle.