# State Ownership Matrix

**The one rule:** if it comes from the "server," it lives in TanStack Query. If it's UI flow/draft state, it lives in Context + Reducer. If it's local to one component, it lives in `useState`. Never the same data in two places.

## Ownership Table

| State | Owner | Persistence | Notes |
|---|---|---|---|
| Auth session (`AuthSession`) | Context + Reducer | `localStorage` | hydrated from storage on boot (decisions row 41); cleared by global 401 handler |
| Specialties | TanStack Query | memory cache | `staleTime: Infinity` — never changes in a session |
| Provider list | TanStack Query | memory cache | keyed by `ProviderFilters` |
| Provider detail | TanStack Query | memory cache | `staleTime: 5 min` |
| Slots for provider | TanStack Query | memory cache | keyed by `(providerId, from, to)` |
| Appointment list | TanStack Query | memory cache | invalidated on create / cancel |
| Appointment detail | TanStack Query | memory cache | invalidated on cancel |
| Documents list | TanStack Query | memory cache | invalidated on upload success / delete |
| **Upload queue** (`UploadTask[]`) | **Context + Reducer** | memory only | holds `File` refs and the optional visit (`appointmentId`); Query can't model transfer progress |
| Conversations list | TanStack Query | memory cache | `refetchInterval: 10_000`, background off |
| Messages for conversation | TanStack Query | memory cache | `refetchInterval: 3_000`, background off; **merge by id** |
| Scheduling wizard draft | Context + Reducer | memory only | reset on unmount / on successful submit |
| Provider filter params | URL search params | URL | shareable, back-button friendly; the source of truth |
| Chat composer text | local `useState` | — | ephemeral |
| Open dialog / sheet | local `useState` | — | ephemeral |
| Toast queue | `sonner` internal | — | ephemeral |
| Theme (light/dark) | Context + Reducer | `localStorage` | enabled (decisions row 14); OS preference is the fallback |

## Query Keys

Centralized in `src/lib/queryKeys.ts`. Every key is a function or a `readonly` tuple. Never inline string arrays.

```ts
import type {
  AppointmentStatus,
  ProviderFilters,
} from '@/types';

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  specialties: {
    all: ['specialties'] as const,
  },
  providers: {
    list: (filters: ProviderFilters) => ['providers', 'list', filters] as const,
    detail: (id: string) => ['providers', 'detail', id] as const,
    slots: (providerId: string, from: string, to: string) =>
      ['providers', 'slots', providerId, { from, to }] as const,
  },
  appointments: {
    list: (status?: AppointmentStatus) =>
      ['appointments', 'list', { status }] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
  },
  documents: {
    list: ['documents', 'list'] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    messages: (conversationId: string) =>
      ['chat', 'messages', conversationId] as const,
  },
};
```

## Invalidation Rules

| Mutation | Invalidates |
|---|---|
| Create appointment | `appointments.list`, `providers.slots(providerId, ...)` |
| Cancel appointment | `appointments.list`, `appointments.detail(id)`, `providers.slots(...)` |
| Upload document | `documents.list` |
| Delete document | `documents.list` |
| Send chat message | does **not** invalidate — optimistic append, poll confirms |

## Reducer Boundaries

Four reducers, each in its own Context so consumers re-render only when their slice changes:

| Reducer | State shape | Actions |
|---|---|---|
| `authReducer` | `{ session: AuthSession \| null, status: 'idle' \| 'loading' \| 'authenticated' \| 'unauthenticated' }` | `HYDRATE`, `LOGIN`, `LOGOUT`, `EXPIRE` |
| `uploadReducer` | `{ tasks: UploadTask[] }` | `ENQUEUE`, `START`, `PROGRESS`, `SUCCESS`, `FAIL`, `RETRY`, `REMOVE`, `CLEAR_COMPLETED` |
| `wizardReducer` | `{ step: number, draft: WizardDraft, status: 'idle' \| 'submitting' \| 'error' }` | `NEXT`, `BACK`, `GOTO`, `UPDATE_DRAFT`, `RESET`, `SUBMIT_START`, `SUBMIT_SUCCESS`, `SUBMIT_ERROR` |
| `themeReducer` | `{ theme: 'light' \| 'dark' }` | `HYDRATE`, `SET`, `TOGGLE` |

Each reducer gets its own `<XProvider>` and `<useX>` hook that throws if used outside the provider. Reducers are pure functions tested in isolation.