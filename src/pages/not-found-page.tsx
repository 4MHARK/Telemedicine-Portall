import { Compass } from 'lucide-react'

import { EmptyState, PageHeader } from '@/components/shared'
import { usePageTitle } from '@/hooks/use-page-title'

export default function NotFoundPage() {
  usePageTitle('Page not found')

  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        icon={Compass}
        title="That page does not exist"
        description="Check the address, or pick a destination from the navigation."
      />
    </>
  )
}
