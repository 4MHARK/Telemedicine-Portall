import { Link } from 'react-router'

import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'
import { isNavItemActive, navItemsForRole } from './nav-items'

/** docs/routes.md: bottom tab bar below `md`, five items. */
export function BottomNav({ currentPath }: { currentPath: string }) {
  const { session } = useAuth()
  const items = navItemsForRole(session?.account.role)

  return (
    <nav
      aria-label="Main"
      className="border-border bg-surface fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      data-slot="bottom-nav"
    >
      <ul className="flex">
        {items.map(({ to, label, icon: Icon }) => {
          const active = isNavItemActive(currentPath, to)
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-[0.6875rem] transition-colors',
                  active ? 'text-primary' : 'text-text-muted hover:text-text',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
