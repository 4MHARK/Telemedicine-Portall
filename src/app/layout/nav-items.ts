import {
  CalendarClock,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Stethoscope,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { AccountRole } from '@/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const PATIENT_NAV_ITEMS: readonly NavItem[] = [
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
]

const DOCTOR_NAV_ITEMS: readonly NavItem[] = [
  { to: '/provider', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/provider/availability', label: 'Availability', icon: CalendarClock },
  { to: '/provider/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/provider/messages', label: 'Messages', icon: MessageSquare },
  { to: '/provider/profile', label: 'Profile', icon: User },
]

/** Kept for callers that only need the patient shell. */
export const NAV_ITEMS = PATIENT_NAV_ITEMS

export function navItemsForRole(role: AccountRole | undefined): readonly NavItem[] {
  return role === 'doctor' ? DOCTOR_NAV_ITEMS : PATIENT_NAV_ITEMS
}

/** `/doctors/prv_01` keeps Doctors active; `/documents` matches exactly. */
export function isNavItemActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`)
}
