import type { ReactNode } from 'react'

import { BottomNav } from './bottom-nav'
import { Header } from './header'
import { IconRail } from './icon-rail'
import { SideNav } from './side-nav'

export interface RootLayoutProps {
  children: ReactNode
  // Supplied by the router; falls back to the current URL.
  currentPath?: string
}

// Bottom tabs below md, icon rail to lg, sidebar above. Takes children so it
// doesn't depend on the router.
export function RootLayout({ children, currentPath }: RootLayoutProps) {
  const pathname = currentPath ?? window.location.pathname

  return (
    <div className="bg-surface text-text flex min-h-screen flex-col" data-slot="root-layout">
      <a
        href="#main-content"
        className="bg-primary text-primary-fg sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <Header />

      <div className="flex flex-1">
        <SideNav currentPath={pathname} />
        <IconRail currentPath={pathname} />
        {/* tabIndex -1 makes the skip link move focus, not just scroll. */}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-16 md:pb-0">
          <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">{children}</div>
        </main>
      </div>

      <BottomNav currentPath={pathname} />
    </div>
  )
}
