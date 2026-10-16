import { cn } from '@/lib/utils'
import { isNavItemActive, NAV_ITEMS } from './nav-items'

/** docs/routes.md: bottom tab bar below `md`, five items. */
export function BottomNav({ currentPath }: { currentPath: string }) {
  return (
    <nav
      aria-label="Main"
      className="border-border bg-surface fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      data-slot="bottom-nav"
    >
      <ul className="flex">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isNavItemActive(currentPath, to)
          return (
            <li key={to} className="flex-1">
              <a
                href={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-[0.6875rem] transition-colors',
                  active ? 'text-primary' : 'text-text-muted hover:text-text',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
