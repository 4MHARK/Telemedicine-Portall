// Deployment base helpers. Vite's BASE_URL is "/" at the domain root and
// "/subpath/" when the app is hosted under a path. The router gets the base as
// its basename; these helpers cover the two places that use window paths
// directly: the 401 redirect and the guard's ?next parameter.
export const APP_BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '')

/** "/subpath/documents" -> "/documents"; unchanged when deployed at root. */
export function stripBasePath(pathname: string, base = APP_BASE_PATH): string {
  if (!base) return pathname
  if (pathname === base) return '/'
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname
}

/** Full browser path to the login screen, including any deployment base. */
export const LOGIN_HREF = `${APP_BASE_PATH}/auth/login`
