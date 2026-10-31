// Guards live in loaders so protected pages never flash.
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
const WizardPage = lazy(() => import('@/features/scheduling/WizardPage'))
const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage'))
const AppointmentDetailPage = lazy(() => import('@/features/appointments/AppointmentDetailPage'))
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'))
const ConversationsPage = lazy(() => import('@/features/chat/ConversationsPage'))
const ChatPage = lazy(() => import('@/features/chat/ChatPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const LoginPage = lazy(() => import('@/pages/login-page'))
const NotFoundPage = lazy(() => import('@/pages/not-found-page'))

export const LOGIN_PATH = '/auth/login'

// Read the token, check exp, otherwise redirect with ?next.
function requireAuth({ request }: LoaderFunctionArgs) {
  if (isTokenUsable(readToken())) return null

  const url = new URL(request.url)
  const next = encodeURIComponent(`${url.pathname}${url.search}`)
  throw redirect(`${LOGIN_PATH}?next=${next}`)
}

// / -> /doctors if signed in, else login.
function redirectFromRoot() {
  throw redirect(isTokenUsable(readToken()) ? '/doctors' : LOGIN_PATH)
}

// Login bounces back to /doctors when already signed in.
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

// Exported so tests can mount it in a memory router.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootRoute />,
    children: [
      {
        // Pathless, so errors render inside the shell instead of replacing it.
        element: <RouteBoundary />,
        errorElement: <RouteErrorPage />,
        children: [
          // Always redirects; the element just keeps the router quiet.
          { index: true, loader: redirectFromRoot, element: <LoadingSkeleton variant="detail" /> },

          { path: 'auth/login', element: <LoginPage />, loader: redirectIfAuthenticated },

          { path: 'doctors', element: <DoctorsListPage /> },
          { path: 'doctors/:providerId', element: <ProviderDetailPage /> },

          // Top-level per the routes.md table; its tree nests it under doctors.
          { path: 'schedule/:providerId', element: <WizardPage />, loader: requireAuth },

          { path: 'appointments', element: <AppointmentsPage />, loader: requireAuth },
          { path: 'appointments/:id', element: <AppointmentDetailPage />, loader: requireAuth },

          { path: 'documents', element: <DocumentsPage />, loader: requireAuth },

          { path: 'messages', element: <ConversationsPage />, loader: requireAuth },
          { path: 'messages/:conversationId', element: <ChatPage />, loader: requireAuth },

          { path: 'profile', element: <ProfilePage />, loader: requireAuth },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
