import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** Usually a Button that starts the first action. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-surface-muted/40 flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
      data-slot="empty-state"
    >
      {Icon ? (
        <span className="bg-surface text-text-muted rounded-full p-3" aria-hidden="true">
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-text-muted mx-auto max-w-prose text-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
