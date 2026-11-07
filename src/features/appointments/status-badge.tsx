import { Badge } from '@/components/ui/badge'
import type { AppointmentStatus } from '@/types'

const LABELS: Record<AppointmentStatus, string> = {
  pending_payment: 'Awaiting payment',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
  expired: 'Expired',
}

const VARIANTS: Record<AppointmentStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending_payment: 'outline',
  scheduled: 'default',
  completed: 'secondary',
  cancelled: 'outline',
  no_show: 'destructive',
  expired: 'destructive',
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant={VARIANTS[status]} data-slot="appointment-status">
      {LABELS[status]}
    </Badge>
  )
}
