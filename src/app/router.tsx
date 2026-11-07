// Guards live in loaders so protected pages never flash.
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, redirect, useLocation } from 'react-router'
import type { LoaderFunctionArgs, RouteObject } from 'react-router'

import { RootLayout } from '@/app/layout'
import { RouteBoundary, RouteErrorPage } from '@/app/route-error'
import { LoadingSkeleton } from '@/components/shared'
import { fetchMe } from '@/features/auth/api'
import { APP_BASE_PATH, stripBasePath } from '@/lib/base-path'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'
import type { AuthSession } from '@/types'

// Route-level code splitting: each page is its own chunk.
const DoctorsListPage = lazy(() => import('@/pages/doctors-list-page'))
const ProviderDetailPage = lazy(() => import('@/features/providers/ProviderDetailPage'))
const WizardPage = lazy(() => import('@/features/scheduling/WizardPage'))
const CheckoutPage = lazy(() => import('@/features/payments/CheckoutPage'))
const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage'))
const AppointmentDetailPage = lazy(() => import('@/features/appointments/AppointmentDetailPage'))
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'))
const ConversationsPage = lazy(() => import('@/features/chat/ConversationsPage'))
const ChatPage = lazy(() => import('@/features/chat/ChatPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const LoginPage = lazy(() => import('@/pages/login-page'))
const SignupPage = lazy(() => import('@/pages/signup-page'))
const NotFoundPage = lazy(() => import('@/pages/not-found-page'))
const ProviderDashboardPage = lazy(() => import('@/features/provider-portal/DashboardPage'))
const ProviderAvailabilityPage = lazy(() => import('@/features/provider-portal/AvailabilityPage'))
const ProviderAppointmentsPage = lazy(
  () => import('@/features/provider-portal/ProviderAppointmentsPage'),
)
const ProviderMessagesPage = lazy(() => import('@/features/provider-portal/ProviderMessagesPage'))
const ProviderProfilePage = lazy(() => import('@/features/provider-portal/ProviderProfilePage'))

export const LOGIN_PATH = '/auth/login'

async function getSession(): Promise<AuthSession | null> {
  try {
    return await queryClient.ensureQueryData({
      queryKey: queryKeys.auth.me,
      queryFn: fetchMe,
      staleTime: 60_000,
    })
  } catch {
    return null
  }
}

function homePathFor(session: AuthSession): string {
  return session.account.role === 'doctor' ? '/provider' : '/doctors'
}

function loginRedirect(request: Request): string {
  const url = new URL(request.url)
  // request.url includes the deployment base; the login route does not.
  const next = encodeURIComponent(`${stripBasePath(url.pathname)}${url.search}`)
  return `${LOGIN_PATH}?next=${next}`
}

async function requirePatient({ request }: LoaderFunctionArgs) {
  const session = await getSession()
  if (!session) throw redirect(loginRedirect(request))
  if (session.account.role !== 'patient') throw redirect('/provider')
  return null
}

async function requireDoctor({ request }: LoaderFunctionArgs) {
  const session = await getSession()
  if (!session) throw redirect(loginRedirect(request))
  if (session.account.role !== 'doctor') throw redirect('/doctors')
  return null
}

async function redirectFromRoot() {
  const session = await getSession()
  throw redirect(session ? homePathFor(session) : LOGIN_PATH)
}

async function redirectIfAuthenticated() {
  const session = await getSession()
  if (session) throw redirect(homePathFor(session))
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
          { path: 'auth/register', element: <SignupPage />, loader: redirectIfAuthenticated },

          { path: 'doctors', element: <DoctorsListPage /> },
          { path: 'doctors/:providerId', element: <ProviderDetailPage /> },

          // Top-level per the routes.md table; its tree nests it under doctors.
          { path: 'schedule/:providerId', element: <WizardPage />, loader: requirePatient },
          {
            path: 'checkout/:appointmentId',
            element: <CheckoutPage />,
            loader: requirePatient,
          },

          { path: 'appointments', element: <AppointmentsPage />, loader: requirePatient },
          { path: 'appointments/:id', element: <AppointmentDetailPage />, loader: requirePatient },

          { path: 'documents', element: <DocumentsPage />, loader: requirePatient },

          { path: 'messages', element: <ConversationsPage />, loader: requirePatient },
          { path: 'messages/:conversationId', element: <ChatPage />, loader: requirePatient },

          { path: 'profile', element: <ProfilePage />, loader: requirePatient },

          { path: 'provider', element: <ProviderDashboardPage />, loader: requireDoctor },
          {
            path: 'provider/availability',
            element: <ProviderAvailabilityPage />,
            loader: requireDoctor,
          },
          {
            path: 'provider/appointments',
            element: <ProviderAppointmentsPage />,
            loader: requireDoctor,
          },
          {
            path: 'provider/messages',
            element: <ProviderMessagesPage />,
            loader: requireDoctor,
          },
          {
            path: 'provider/messages/:conversationId',
            element: <ChatPage />,
            loader: requireDoctor,
          },
          {
            path: 'provider/profile',
            element: <ProviderProfilePage />,
            loader: requireDoctor,
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

// Vite's BASE_URL keeps deep links working when the app is deployed under a
// subpath (e.g. GitHub Pages); it is "/" everywhere else.
export const router = createBrowserRouter(routes, { basename: APP_BASE_PATH || '/' })
