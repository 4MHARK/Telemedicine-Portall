/**
 * Route table, transcribed from docs/routes.md.
 *
 * Guards run in `loader`, not in wrapper components — docs/routes.md is
 * explicit about that, and it is what avoids a flash of protected content.
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, redirect, useLocation } from 'react-router'
import type { LoaderFunctionArgs, RouteObject } from 'react-router'

import { RootLayout } from '@/app/layout'
import { RouteBoundary, RouteErrorPage } from '@/app/route-error'
import { LoadingSkeleton } from '@/components/shared'
import { isTokenUsable } from '@/lib/jwt'
import { readToken } from '@/lib/session'

// Route-level code splitting: each page is its own chunk.
const DoctorsListPage = lazy(() => import('@/pages/doctors-list-page'))
const ProviderDetailPage = lazy(() => import('@/features/providers/ProviderDetailPage'))
const SchedulePage = lazy(() => import('@/pages/schedule-page'))
const AppointmentsPage = lazy(() => import('@/pages/appointments-page'))
const AppointmentDetailPage = lazy(() => import('@/pages/appointment-detail-page'))
const DocumentsPage = lazy(() => import('@/pages/documents-page'))
const MessagesPage = lazy(() => import('@/pages/messages-page'))
const ConversationPage = lazy(() => import('@/pages/conversation-page'))
const ProfilePage = lazy(() => import('@/pages/profile-page'))
const LoginPage = lazy(() => import('@/pages/login-page'))
const NotFoundPage = lazy(() => import('@/pages/not-found-page'))

export const LOGIN_PATH = '/auth/login'

/**
 * docs/routes.md § Auth Guard:
 *   1. read the token from localStorage
 *   2. validate structure + `exp` against the current time (client-side, mock)
 *   3. invalid or expired -> redirect to /auth/login?next=<pathname>
 *   4. valid -> continue
 *
 * Step 4 of that list ("attach patient to loader data") is not done yet: the
 * auth Context is still the Phase 1 placeholder, so there is nothing to attach
 * the patient to. The guard's redirect behaviour is complete.
 */
function requireAuth({ request }: LoaderFunctionArgs) {
  if (isTokenUsable(readToken())) return null

  const url = new URL(request.url)
  const next = encodeURIComponent(`${url.pathname}${url.search}`)
  throw redirect(`${LOGIN_PATH}?next=${next}`)
}

/** `/` -> authed ? /doctors : /auth/login */
function redirectFromRoot() {
  throw redirect(isTokenUsable(readToken()) ? '/doctors' : LOGIN_PATH)
}

/** `/auth/login` -> authed ? /doctors : render the form */
function redirectIfAuthenticated() {
  if (isTokenUsable(readToken())) throw redirect('/doctors')
  return null
}

function RootRoute() {
  const location = useLocation()

  return (
    <RootLayout currentPath={location.pathname}>
      <Suspense fallback={<LoadingSkeleton variant="detail" />}>
        <Outlet />
      </Suspense>
    </RootLayout>
  )
}

/** Exported separately so tests can mount it in a memory router. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootRoute />,
    children: [
      {
        // Pathless: render errors are caught by react-error-boundary, loader
        // and thrown-response errors by the router's errorElement. Because
        // this route has no path, both render in the Outlet slot and the shell
        // survives.
        element: <RouteBoundary />,
        errorElement: <RouteErrorPage />,
        children: [
          // The loader always throws a redirect, so this element never paints.
          // It exists because React Router warns about a leaf route with no
          // element, and a clean console matters for the browser checks.
          { index: true, loader: redirectFromRoot, element: <LoadingSkeleton variant="detail" /> },

          { path: 'auth/login', element: <LoginPage />, loader: redirectIfAuthenticated },

          { path: 'doctors', element: <DoctorsListPage /> },
          { path: 'doctors/:providerId', element: <ProviderDetailPage /> },

          // routes.md's route table puts the wizard at /schedule/:providerId, while
          // its route tree nests it under doctors. The table wins here; the
          // contradiction is reported.
          { path: 'schedule/:providerId', element: <SchedulePage />, loader: requireAuth },

          { path: 'appointments', element: <AppointmentsPage />, loader: requireAuth },
          { path: 'appointments/:id', element: <AppointmentDetailPage />, loader: requireAuth },

          { path: 'documents', element: <DocumentsPage />, loader: requireAuth },

          { path: 'messages', element: <MessagesPage />, loader: requireAuth },
          { path: 'messages/:conversationId', element: <ConversationPage />, loader: requireAuth },

          { path: 'profile', element: <ProfilePage />, loader: requireAuth },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
