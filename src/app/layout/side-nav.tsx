import { Link } from 'react-router'

import { cn } from '@/lib/utils'
import { isNavItemActive, NAV_ITEMS } from './nav-items'

/** docs/routes.md: full sidebar from `lg` up. */
export function SideNav({ currentPath }: { currentPath: string }) {
  return (
    <nav
      aria-label="Main"
      className="border-border hidden shrink-0 border-r lg:block lg:w-56"
      data-slot="side-nav"
    >
      <ul className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isNavItemActive(currentPath, to)
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-surface-muted text-text font-medium'
                    : 'text-text-muted hover:bg-surface-muted hover:text-text',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
