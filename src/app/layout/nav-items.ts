import { CalendarDays, FileText, MessageSquare, Stethoscope, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/**
 * The five destinations in docs/routes.md that appear in navigation. The auth
 * and scheduling routes are reached from within a page, not the shell.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
]

/** `/doctors/prv_01` keeps Doctors active; `/documents` matches exactly. */
export function isNavItemActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`)
}
