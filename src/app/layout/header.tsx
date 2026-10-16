import { LogIn, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMe } from '@/features/auth'
import { useTheme } from '@/features/theme'
import { readToken } from '@/lib/session'

/**
 * Logo, the signed-in patient's menu, and the theme toggle.
 *
 * The patient comes from GET /auth/me rather than the auth Context, which is
 * still the Phase 1 placeholder — the query reflects whatever token is in
 * storage, which is what the login flow writes.
 */
export function Header() {
  const { theme, toggleTheme } = useTheme()
  const hasSession = Boolean(readToken())
  const { data: patient } = useMe(hasSession)
  const isDark = theme === 'dark'

  return (
    <header className="border-border bg-surface/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 lg:px-6">
        <a
          href="/doctors"
          className="flex items-center gap-2 font-semibold tracking-tight"
          aria-label="Telemedicine Portal home"
        >
          <span className="bg-primary text-primary-fg grid size-7 place-items-center rounded-md text-sm">
            T
          </span>
          <span className="hidden sm:inline">Telemedicine Portal</span>
        </a>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={isDark}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={patient ? `Account menu for ${patient.firstName}` : 'Account menu'}
                />
              }
            >
              {patient ? (
                <img
                  src={patient.avatarUrl}
                  alt=""
                  className="size-7 rounded-full"
                  width={28}
                  height={28}
                />
              ) : (
                <span className="bg-surface-muted text-text-muted grid size-7 place-items-center rounded-full text-xs">
                  <LogIn className="size-3.5" />
                </span>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {patient ? (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block font-medium">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="text-text-muted block text-xs font-normal">
                      {patient.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<a href="/profile" />}>Profile</DropdownMenuItem>
                </DropdownMenuGroup>
              ) : (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block font-medium">Not signed in</span>
                    <span className="text-text-muted block text-xs font-normal">
                      Sign in to manage your care
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<a href="/auth/login" />}>Sign in</DropdownMenuItem>
                </DropdownMenuGroup>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
