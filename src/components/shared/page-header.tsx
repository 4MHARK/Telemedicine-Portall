import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  description?: string
  /** Rendered at the end of the row — actions, filters, a primary button. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    // A <div>, not a <header>: a <header> that is not scoped to article/aside/
    // nav/section maps to the `banner` landmark role, which would give every
    // page a second banner alongside the app header.
    <div
      className={cn('flex flex-wrap items-start justify-between gap-4 pb-6', className)}
      data-slot="page-header"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description ? <p className="text-text-muted text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
