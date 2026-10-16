import { Hammer } from 'lucide-react'

import { EmptyState, PageHeader } from '@/components/shared'

export interface ComingSoonProps {
  title: string
  description: string
}

/**
 * Phase 2 ships the shell and the mock API, not the features. Every route that
 * Phase 3 owns renders this rather than a bare "TODO".
 */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Hammer}
        title="Coming in Phase 3"
        description="The shell, routing and mock API are in place. This screen is next."
      />
    </>
  )
}
