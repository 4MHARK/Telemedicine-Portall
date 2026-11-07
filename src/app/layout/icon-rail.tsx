import { Link } from 'react-router'

import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'
import { isNavItemActive, navItemsForRole } from './nav-items'

/**
 * docs/routes.md: icon rail from `md` until `lg`. Icons carry an aria-label
 * and a title, since there is no visible text at this width.
 */
export function IconRail({ currentPath }: { currentPath: string }) {
  const { session } = useAuth()
  const items = navItemsForRole(session?.account.role)

  return (
    <nav
      aria-label="Main"
      className="border-border hidden shrink-0 border-r md:flex md:flex-col md:items-center md:gap-1 md:py-4 lg:hidden"
      data-slot="icon-rail"
    >
      {items.map(({ to, label, icon: Icon }) => {
        const active = isNavItemActive(currentPath, to)
        return (
          <Link
            key={to}
            to={to}
            title={label}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'grid size-10 place-items-center rounded-md transition-colors',
              active
                ? 'bg-surface-muted text-text'
                : 'text-text-muted hover:bg-surface-muted hover:text-text',
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </Link>
        )
      })}
    </nav>
  )
}
